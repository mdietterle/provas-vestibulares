import glob

# Find all pdf_import.py files
for file_path in glob.glob("app/services/**/pdf_import.py", recursive=True):
    with open(file_path, "r") as f:
        content = f.read()
    
    if "from bs4 import BeautifulSoup" in content:
        new_content = content.replace("from bs4 import BeautifulSoup\n", "")
        with open(file_path, "w") as f:
            f.write(new_content)
        print(f"Removed bs4 from {file_path}")
