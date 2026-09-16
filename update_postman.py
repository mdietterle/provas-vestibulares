import json
import os

all_institutions = [
    "ita", "uerj", "ufgd", "uem", "ufms", "fuvest", "pucrio", "udesc", "unesp",
    "cebraspe", "unifesp", "espm", "fgv", "pucrs", "ufpel", "unicamp", "ufg",
    "ufjf", "ufu", "ufv", "ufpa", "utfpr", "unioeste", "ufmg", "uel", "unifei",
    "pucminas", "uepg", "upe", "ufrn", "ufsm", "ufla", "ufam", "pucsp", "unifor",
    "uece", "puccampinas", "unimontes", "unicentro", "uesb", "unaerp", "uema"
]

postman_file = "Provas_Importadores.postman_collection.json"

with open(postman_file, "r") as f:
    collection = json.load(f)

existing_folders = {item["name"].lower(): item for item in collection.get("item", [])}

for inst in all_institutions:
    inst_lower = inst.lower()
    
    # Try to find existing folder (case insensitive matching)
    folder = None
    for folder_name, folder_data in existing_folders.items():
        if inst_lower in folder_name:
            folder = folder_data
            break
            
    if not folder:
        # Create new folder
        folder = {
            "name": inst.upper(),
            "item": []
        }
        collection["item"].append(folder)
    
    # Check if "Listar todas" exists
    has_listar = any(req["name"] == "Listar todas" for req in folder["item"])
    if not has_listar:
        folder["item"].append({
            "name": "Listar todas",
            "request": {
                "auth": {
                    "type": "bearer",
                    "bearer": [
                        {
                            "key": "token",
                            "value": "{{access_token}}",
                            "type": "string"
                        }
                    ]
                },
                "method": "GET",
                "header": [],
                "url": {
                    "raw": f"{{{{base_url}}}}/{inst_lower}/questions",
                    "host": ["{{base_url}}"],
                    "path": [inst_lower, "questions"]
                }
            },
            "response": []
        })
        
    # Check if "Importar TODAS as provas" exists
    has_import = any("Importar TODAS" in req["name"] or "Import" in req["name"] for req in folder["item"])
    if not has_import:
        folder["item"].append({
            "name": "Importar TODAS as provas (site oficial)",
            "request": {
                "auth": {
                    "type": "bearer",
                    "bearer": [
                        {
                            "key": "token",
                            "value": "{{access_token}}",
                            "type": "string"
                        }
                    ]
                },
                "method": "POST",
                "header": [],
                "url": {
                    "raw": f"{{{{base_url}}}}/{inst_lower}/import",
                    "host": ["{{base_url}}"],
                    "path": [inst_lower, "import"]
                },
                "description": f"Inicia a importação de provas para {inst.upper()}."
            },
            "response": []
        })

with open(postman_file, "w") as f:
    json.dump(collection, f, indent=2)

print("Postman collection updated successfully.")
