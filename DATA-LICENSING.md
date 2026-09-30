# Data licensing

This repository contains integration software. It does not grant rights to
third-party data retrieved from PVOG, FIM or other public-administration
systems.

Three things are licensed separately:

1. the source code and original documentation of this repository;
2. the documentation published by the upstream API operators;
3. the catalogue and service data returned by the upstream APIs.

## 1. Source code of this repository

The source-code license of this repository ([`LICENSE`](LICENSE), Apache
License 2.0) applies only to the code and to the original documentation
written for this repository. It does not cover any upstream data or any
upstream documentation that is quoted or excerpted here.

## 2. Upstream API documentation

| Source                                     | What was found (checked 2026-09-30)                                                                                                                                                     |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PVOG Suchdienst OpenAPI document           | Declares `Creative Commons Attribution Share Alike 4.0 (CC BY-SA 4.0)` in its `info.license` field: <https://pvog.fitko.net/suchdienst/api/v3/api-docs>                                 |
| PVOG Produktportal (product documentation) | `Copyright © 2026 PVOG, Dataport AöR`; the imprint states that page content is generally protected by copyright. No open license was identified: <https://produktportal.pvog.fitko.de/> |
| FIM Portal OpenAPI document                | No license field declared: <https://fimportal.de/openapi.json>                                                                                                                          |
| FIM user documentation (docs.fitko.de)     | States that its content is licensed under CC BY 4.0 unless noted otherwise: <https://docs.fitko.de/fim/docs>                                                                            |

The handbook in [`apps/api/docs/INTEGRATIONS.md`](apps/api/docs/INTEGRATIONS.md)
reproduces endpoint names, parameter names and short, trimmed example
responses for the purpose of documenting the integration interface.

## 3. Upstream data

Data returned by upstream services remains subject to the terms and licensing
conditions of the respective provider.

| Data source                                                        | License status (checked 2026-09-30)                                                                                                                  |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| PVOG Suchdienst (service descriptions, locations, online services) | No explicit data license was identified in the API responses, the OpenAPI document or the product portal. Operator: FITKO, operated by Dataport AöR. |
| FIM Portal (LeiKa catalog, master texts)                           | No explicit data license was identified in the API responses or the OpenAPI document. Operator: FITKO.                                               |

Official source links:

- PVOG Produktportal: <https://produktportal.pvog.fitko.de/>
- PVOG Suchdienst API: <https://pvog.fitko.net/suchdienst/api/v3/api-docs>
- FIM Portal: <https://fimportal.de/>
- FIM Portal API documentation: <https://fimportal.de/docs>
- FITKO: <https://www.fitko.de/>

Before redistributing, storing or commercially using upstream data obtained
through this software, clarify the applicable terms directly with the
respective operator. This document records what was found on the stated
date; it is not legal advice.
