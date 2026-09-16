import os

with open("src/api/index.ts", "r") as f:
    content = f.read()

institutions = ["ufg", "ufjf", "ufu", "ufv", "ufpa", "utfpr", "unioeste", "ufmg", "uel"]

new_exports = ""
for inst in institutions:
    new_exports += f"""
export const {inst}Api = {{
  runImportAll: async (params?: any) => {{
    const response = await api.post('/{inst}/import', params)
    return response.data
  }}
}}
"""

content += new_exports

with open("src/api/index.ts", "w") as f:
    f.write(content)

print("API updated.")
