import unittest

from app.services.enem.pdf_import import _extract_pdf_links, _select_pdf_candidate


class EnemMecImportTests(unittest.TestCase):
    def test_extracts_pdf_links_from_mec_page_html(self):
        html = """
        <html><body>
            <a href="https://download.gov.br/prova-enem-2024-dia1.pdf">Prova ENEM 2024 - 1º dia</a>
            <a href="https://download.gov.br/gabarito-enem-2024-dia1.pdf">Gabarito ENEM 2024 - 1º dia</a>
            <a href="https://download.gov.br/prova-enem-2023.pdf">Prova ENEM 2023</a>
        </body></html>
        """

        links = _extract_pdf_links(html)

        self.assertEqual(3, len(links))
        self.assertTrue(all(link["url"].endswith('.pdf') for link in links))

    def test_selects_the_best_candidate_for_prova_and_gabarito(self):
        html = """
        <html><body>
            <a href="https://download.gov.br/prova-enem-2024.pdf">Prova ENEM 2024</a>
            <a href="https://download.gov.br/gabarito-enem-2024.pdf">Gabarito ENEM 2024</a>
            <a href="https://download.gov.br/prova-enem-2023.pdf">Prova ENEM 2023</a>
        </body></html>
        """

        prova = _select_pdf_candidate(html, year=2024, is_gabarito=False)
        gabarito = _select_pdf_candidate(html, year=2024, is_gabarito=True)

        self.assertTrue(prova.endswith('prova-enem-2024.pdf'))
        self.assertTrue(gabarito.endswith('gabarito-enem-2024.pdf'))


if __name__ == '__main__':
    unittest.main()
