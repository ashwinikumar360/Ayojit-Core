# AIKosh Dataset & Model Attributions

This repository incorporates publicly available AI models and datasets sourced from AIKosh (aikosh.indiaai.gov.in). The table below lists each asset used across the five applications, along with licensing details and integration logic:

| Application | Asset Name | AIKosh URL | License Type | Integration Logic |
| --- | --- | --- | --- | --- |
| **Kisan Voice AI** | KCC Query Transcripts | [aikosh.indiaai.gov.in/datasets/kcc](https://aikosh.indiaai.gov.in) | GODL-India | Extracted Q&A pairs embedded into ChromaDB collection to serve as context for RAG queries. |
| **PinAI** | Pincode Directory & Aadhaar Centers | [aikosh.indiaai.gov.in/datasets/pincode](https://aikosh.indiaai.gov.in) | GODL-India | Loaded into SQLite database to resolve local coordinates and center schedules. |
| **DocPatram** | Patram-7B Model | [aikosh.indiaai.gov.in/models/patram7b](https://aikosh.indiaai.gov.in) | Open / Custom | Called via remote Hugging Face Space endpoint to generate legal templates and official drafts. |
| **VaadVivaad** | MSME Act Dataset & Sarvam-105B | [aikosh.indiaai.gov.in/models/sarvam](https://aikosh.indiaai.gov.in) | Open / Custom | Used to structure mediation prompts and run automated arbitration logs on dispute statements. |
| **HindiDiff** | Baaz-v1 Diffusion | [aikosh.indiaai.gov.in/models/baaz](https://aikosh.indiaai.gov.in) | Creative Commons BY-NC | Packaged into Hugging Face Space Docker image to execute text-to-image prompts in Hindi. |

---

## Verbatim Disclaimer

This application uses publicly available AI models/datasets sourced via AIKosh (aikosh.indiaai.gov.in), an AI repository maintained by IndiaAI under the Ministry of Electronics & Information Technology, Government of India. Ayojit Intelligence is an independent product and is not affiliated with, endorsed by, or sponsored by AIKosh, IndiaAI, or the Government of India.
