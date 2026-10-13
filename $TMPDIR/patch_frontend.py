import re, glob, os

# === 1. Patch API client files: add exam_name param to runImportAll/runSeed ===

api_files = glob.glob("frontend/src/api/*.ts")
for fpath in sorted(api_files):
    content = open(fpath).read()
    changed = False

    # Pattern A: inline arrow functions like:
    #   runImportAll: (since?: number, until?: number, forceReimport = false) => api.post('...', undefined, { params: { since_year: since, until_year: until, force_reimport: forceReimport } }),
    # Pattern B: same but runSeed

    for method in ['runImportAll', 'runSeed']:
        # Match the method signature and params object
        old_pattern = re.compile(
            rf"({method}:\s*\(since\?:\s*number,\s*until\?:\s*number,\s*forceReimport\s*=\s*false\)\s*=>\s*api\.post\([^)]+\{{\s*params:\s*\{{\s*since_year:\s*since,\s*until_year:\s*until,\s*force_reimport:\s*forceReimport\s*\}}\s*\}})"
        )
        match = old_pattern.search(content)
        if match:
            new = match.group(0).replace(
                "forceReimport = false)",
                "forceReimport = false, examName?: string)"
            ).replace(
                "force_reimport: forceReimport }",
                "force_reimport: forceReimport, exam_name: examName }"
            )
            content = content[:match.start()] + new + content[match.end():]
            changed = True

    # Pattern C: async functions like:
    #   runImportAll: async (since?: number, until?: number, forceReimport = false) => {
    #     const response = await api.post('/ufg/import', undefined, { params: { since_year: since, until_year: until, force_reimport: forceReimport } })
    async_pattern = re.compile(
        r"(runImportAll:\s*async\s*\(since\?:\s*number,\s*until\?:\s*number,\s*forceReimport\s*=\s*false\))"
    )
    amatch = async_pattern.search(content)
    if amatch:
        new_sig = amatch.group(0).replace(
            "forceReimport = false)",
            "forceReimport = false, examName?: string)"
        )
        content = content[:amatch.start()] + new_sig + content[amatch.end():]
        # Also fix the params inside the function body
        content = content.replace(
            "force_reimport: forceReimport }",
            "force_reimport: forceReimport, exam_name: examName }"
        )
        changed = True

    # Add getExamVersions method to each API object that has runImportAll or runSeed
    if ('runImportAll' in content or 'runSeed' in content) and 'getExamVersions' not in content:
        # Find the router prefix from existing API calls
        prefix_match = re.search(r"api\.(?:post|get)\(['\"](/[^'\"]+?)/(?:admin/)?(?:import-all|run-seed|import)['\"]", content)
        if prefix_match:
            prefix = prefix_match.group(1)
            # Add getExamVersions before the closing of the object
            # Find last method in the object
            versions_method = f"\n  getExamVersions: (year?: number) => api.get<string[]>(`{prefix}/admin/exam-versions`, {{ params: {{ year }} }}),"
            # Insert before the last },\n} or },\nexport
            # Find the closing of the api object
            close_match = re.search(r'(  \},?\s*\n\})', content)
            if close_match:
                insert_pos = close_match.start()
                content = content[:insert_pos] + versions_method + "\n" + content[insert_pos:]
                changed = True

    if changed:
        open(fpath, "w").write(content)
        print(f"  patched: {fpath}")

# === 2. Patch index.ts inline API objects ===
idx_path = "frontend/src/api/index.ts"
content = open(idx_path).read()
changed = False

# Fix inline runSeed/runImportAll signatures
for method in ['runImportAll', 'runSeed']:
    old_pattern = re.compile(
        rf"({method}:\s*\(since\?:\s*number,\s*until\?:\s*number,\s*forceReimport\s*=\s*false\)\s*=>\s*api\.post\([^)]+\{{\s*params:\s*\{{\s*since_year:\s*since,\s*until_year:\s*until,\s*force_reimport:\s*forceReimport\s*\}}\s*\}})"
    )
    for match in old_pattern.finditer(content):
        new = match.group(0).replace(
            "forceReimport = false)",
            "forceReimport = false, examName?: string)"
        ).replace(
            "force_reimport: forceReimport }",
            "force_reimport: forceReimport, exam_name: examName }"
        )
        content = content[:match.start()] + new + content[match.end():]
        changed = True

# Fix async inline functions
async_pattern = re.compile(
    r"(runImportAll:\s*async\s*\(since\?:\s*number,\s*until\?:\s*number,\s*forceReimport\s*=\s*false\))"
)
for amatch in async_pattern.finditer(content):
    new_sig = amatch.group(0).replace(
        "forceReimport = false)",
        "forceReimport = false, examName?: string)"
    )
    content = content[:amatch.start()] + new_sig + content[amatch.end():]
    changed = True

# Fix params in async bodies
content = re.sub(
    r"(force_reimport:\s*forceReimport)(\s*\}\s*\})",
    r"\1, exam_name: examName\2",
    content
)

if changed:
    open(idx_path, "w").write(content)
    print(f"  patched: {idx_path}")

print("\nAPI clients done.")