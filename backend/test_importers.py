import sys
import logging
sys.path.insert(0, '.')
from app.services.espm.pdf_import import fetch_espm_exam_links
from app.services.fgv.pdf_import import fetch_fgv_exam_links

print("Testing ESPM...")
try:
    espm_links = fetch_espm_exam_links()
    print(f"ESPM found {len(espm_links)} links.")
    if espm_links: print(espm_links[0])
except Exception as e:
    print(f"ESPM Error: {e}")

print("\nTesting FGV...")
try:
    fgv_links = fetch_fgv_exam_links()
    print(f"FGV found {len(fgv_links)} links.")
    if fgv_links: print(fgv_links[0])
except Exception as e:
    print(f"FGV Error: {e}")
