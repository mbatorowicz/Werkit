import os
import re

pattern_with_getuserid = re.compile(
    r"import\s*\{\s*cookies\s*\}\s*from\s*'next/headers';\s*"
    r"import\s*\{\s*jwtVerify\s*\}\s*from\s*'jose';\s*"
    r"const\s+JWT_SECRET\s*=\s*new\s+TextEncoder\(\)\.encode\(process\.env\.JWT_SECRET\s*\|\|\s*'super-secret-fallback'\);\s*"
    r"async\s+function\s+getUserId\(\)\s*\{.*?\n\}\s*",
    re.DOTALL
)

pattern_only_jwt = re.compile(
    r"import\s*\{\s*jwtVerify\s*\}\s*from\s*'jose';\s*"
    r"const\s+JWT_SECRET\s*=\s*new\s+TextEncoder\(\)\.encode\(process\.env\.JWT_SECRET\s*\|\|\s*'super-secret-fallback'\);\s*",
    re.DOTALL
)

pattern_only_jwt_no_import = re.compile(
    r"const\s+JWT_SECRET\s*=\s*new\s+TextEncoder\(\)\.encode\(process\.env\.JWT_SECRET\s*\|\|\s*'super-secret-fallback'\);\s*",
    re.DOTALL
)

for root, _, files in os.walk('src'):
    for f in files:
        if f.endswith('.ts') or f.endswith('.tsx'):
            path = os.path.join(root, f)
            if 'middleware.ts' in path or 'lib\\auth.ts' in path or 'lib/auth.ts' in path: continue
            
            with open(path, 'r', encoding='utf-8') as file:
                content = file.read()
            
            if pattern_with_getuserid.search(content):
                new_content = pattern_with_getuserid.sub("import { getUserId } from '@/lib/auth';\n", content)
                with open(path, 'w', encoding='utf-8') as file:
                    file.write(new_content)
                print(f"Refactored getUserId in {path}")
            elif pattern_only_jwt.search(content):
                new_content = pattern_only_jwt.sub("import { JWT_SECRET } from '@/lib/auth';\nimport { jwtVerify } from 'jose';\n", content)
                with open(path, 'w', encoding='utf-8') as file:
                    file.write(new_content)
                print(f"Refactored JWT_SECRET in {path}")
            elif pattern_only_jwt_no_import.search(content):
                new_content = pattern_only_jwt_no_import.sub("import { JWT_SECRET } from '@/lib/auth';\n", content)
                with open(path, 'w', encoding='utf-8') as file:
                    file.write(new_content)
                print(f"Refactored JWT_SECRET (no import) in {path}")
