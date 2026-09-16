"""Extração de figuras (imagens raster + desenhos vetoriais) de páginas de PDF.

Os importadores de vestibular historicamente extraíam apenas XObjects de
imagem raster via `page.get_images()` + `page.get_image_rects()`. Isso não
captura figuras desenhadas nativamente na página com operadores de conteúdo
vetorial (linhas, curvas, retângulos — o que `page.get_drawings()` enxerga),
comum em diagramas de física/química/geometria. Uma questão com esse tipo de
figura era importada sem nenhuma imagem, mesmo com o enunciado referenciando
"Figura 1"/"Figura 2".

Este módulo une as duas fontes (raster + vetor), agrupa desenhos vizinhos
numa mesma região e recorta a figura por RENDERIZAÇÃO da página (não por
reconstrução dos paths), o que resolve de graça o caso de rótulos de texto
dentro do diagrama: o clip pega tudo que está visualmente na área.
"""

from __future__ import annotations

try:
    import fitz  # PyMuPDF
except ModuleNotFoundError:  # pragma: no cover - import fallback for tests
    fitz = None

# Paths triviais (sublinhados, bordas de tabela, linhas divisórias, marcadores
# de bullet) não devem virar "figura". Um desenho real de diagrama tende a ter
# bbox com alguma extensão nas duas dimensões; um traço decorativo costuma ser
# quase um segmento de reta (uma das dimensões próxima de zero).
_MIN_DRAWING_DIM = 8.0  # pt — abaixo disso, provavelmente é traço/sublinhado
_MIN_DRAWING_AREA = 400.0  # pt² — descarta ícones/marcadores minúsculos
_CLUSTER_GAP = 12.0  # pt — desenhos a até essa distância são a mesma figura
_MARGIN = 3.0  # pt — folga no recorte final, evita cortar borda do traço


def _drawing_bboxes(page) -> list["fitz.Rect"]:
    """Bboxes de desenhos vetoriais candidatos a figura.

    Molduras/bordas decorativas de página são comuns em provas (um retângulo
    cobrindo quase a página inteira) e, se entrassem no clustering, fariam a
    figura real inteira ser absorvida num cluster gigante — que depois seria
    descartado pelo filtro de "página inteira" em extract_figure_events,
    apagando a figura junto. Por isso o corte por tamanho acontece aqui,
    ANTES do agrupamento, não só no cluster final.
    """
    page_rect = page.rect
    page_area = page_rect.width * page_rect.height
    boxes = []
    for d in page.get_drawings():
        r = d.get("rect")
        if r is None:
            continue
        r = fitz.Rect(r) & page_rect  # clampa: bordas às vezes têm coords fora da página
        if r.is_empty:
            continue
        if r.width < _MIN_DRAWING_DIM or r.height < _MIN_DRAWING_DIM:
            continue
        area = r.width * r.height
        if area < _MIN_DRAWING_AREA:
            continue
        if area > page_area * 0.6:
            continue  # provável moldura/borda decorativa da página, não uma figura
        boxes.append(r)
    return boxes


def _image_bboxes(page) -> list["fitz.Rect"]:
    boxes = []
    for img_info in page.get_images(full=True):
        xref = img_info[0]
        try:
            rects = page.get_image_rects(xref)
        except Exception:
            continue
        if not rects:
            continue
        r = rects[0]
        if r.width < 15 or r.height < 15:
            continue
        boxes.append(fitz.Rect(r))
    return boxes


def _cluster(boxes: list["fitz.Rect"], gap: float) -> list["fitz.Rect"]:
    """Une retângulos que se tocam ou estão a até `gap` pt de distância em um
    único bbox por figura (evita que uma figura com vários paths/imagens vire
    vários "eventos" fragmentados)."""
    clusters: list["fitz.Rect"] = []
    for box in boxes:
        expanded = fitz.Rect(box.x0 - gap, box.y0 - gap, box.x1 + gap, box.y1 + gap)
        merged = False
        for i, c in enumerate(clusters):
            if expanded.intersects(c):
                clusters[i] = c | box
                merged = True
                break
        if not merged:
            clusters.append(fitz.Rect(box))

    # uma passada de re-clustering: unir dois clusters que ficaram vizinhos
    # depois de crescerem com boxes anteriores
    changed = True
    while changed:
        changed = False
        for i in range(len(clusters)):
            for j in range(i + 1, len(clusters)):
                a, b = clusters[i], clusters[j]
                expanded_a = fitz.Rect(a.x0 - gap, a.y0 - gap, a.x1 + gap, a.y1 + gap)
                if expanded_a.intersects(b):
                    clusters[i] = a | b
                    clusters.pop(j)
                    changed = True
                    break
            if changed:
                break
    return clusters


def extract_figure_events(page, page_area_ratio_max: float = 0.85) -> list[tuple[float, float, bytes]]:
    """Retorna [(x0, y0, png_bytes), ...] para cada figura detectada na página,
    ordenado por posição vertical. Une imagens raster embutidas com regiões de
    desenho vetorial nativo e recorta cada região via renderização da página
    (`get_pixmap(clip=...)`), o que também captura rótulos de texto que
    estejam dentro da própria figura.

    x0 é exposto para quem monta o fluxo de leitura de layouts em colunas
    (ex.: ENEM, 2 colunas) — sem ele, uma figura da coluna direita pode ser
    erroneamente inserida entre linhas de texto da coluna esquerda só por
    estar numa faixa de y parecida."""
    if fitz is None:
        return []

    boxes = _image_bboxes(page) + _drawing_bboxes(page)
    if not boxes:
        return []

    page_area = page.rect.width * page.rect.height
    events: list[tuple[float, float, bytes]] = []
    for rect in _cluster(boxes, _CLUSTER_GAP):
        if rect.width * rect.height > page_area * page_area_ratio_max:
            continue  # provável fundo/marca d'água cobrindo a página inteira
        clip = fitz.Rect(
            max(rect.x0 - _MARGIN, page.rect.x0),
            max(rect.y0 - _MARGIN, page.rect.y0),
            min(rect.x1 + _MARGIN, page.rect.x1),
            min(rect.y1 + _MARGIN, page.rect.y1),
        )
        try:
            pix = page.get_pixmap(clip=clip, dpi=200)
            png = pix.tobytes("png")
        except Exception:
            continue
        events.append((clip.x0, clip.y0, png))

    events.sort(key=lambda e: e[1])
    return events


def text_content_y_range(page) -> tuple[float, float]:
    """(y_min, y_max) ocupado por blocos de texto na página, para estimar a
    posição relativa de uma figura dentro do FLUXO DE TEXTO (não da página
    inteira). Importadores que operam sobre texto achatado — sem
    coordenada por caractere — usam essa faixa para projetar a posição
    vertical de uma figura num offset aproximado dentro do texto extraído:
    `frac = (y0 - y_min) / (y_max - y_min)`.

    Usar a altura da página inteira em vez dessa faixa sub-estima a posição
    de qualquer figura numa página cujo conteúdo não ocupe até a borda
    inferior (comum na última página de uma seção, ou provas com margem
    grande) — a figura "parece" estar mais perto do topo do documento do
    que realmente está no fluxo de texto, e acaba anexada à questão
    errada (a anterior, ainda aberta)."""
    if fitz is None:
        return (0.0, 1.0)
    y_min, y_max = None, None
    for block in page.get_text("dict")["blocks"]:
        if block["type"] != 0:
            continue
        y0, y1 = block["bbox"][1], block["bbox"][3]
        y_min = y0 if y_min is None else min(y_min, y0)
        y_max = y1 if y_max is None else max(y_max, y1)
    if y_min is None:
        return (page.rect.y0, page.rect.y1)
    return (y_min, y_max)
