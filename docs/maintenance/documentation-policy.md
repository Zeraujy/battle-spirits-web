# Documentation Policy

Documentation filenames must use English-compatible lowercase kebab-case. `README.md` is the only allowed uppercase documentation filename.

Keep documentation focused on the current architecture, workflows and maintenance contracts. Do not add phase, batch or release-status documents to the permanent tree.

Historical implementation notes should be consolidated into a current architecture document or removed after their automated validation has been transferred to tests or audits.

Executable audits must validate source code, data and runtime contracts directly. They must not depend on historical Markdown files to pass.
