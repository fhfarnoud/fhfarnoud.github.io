# Published research panels for content slides 11 and 13

These assets contain actual published experimental plots, not schematic curves or digitized approximations.

- `wei-fig2a-arithmetic.png` and `wei-fig2d-persian.png`: direct 600-dpi crops from Wei et al. (2022), *Emergent Abilities of Large Language Models*, arXiv:2206.07682v2, PDF page 4, Figure 2A and 2D. These PNG source crops retain the original panel titles, ticks, axes, points, curves, and random baselines unchanged. The shared training-FLOPs axis label and applicable model-family legend are supplied by the slide.
- `schaeffer-fig3-addition-accuracy.svg` and `schaeffer-fig3-addition-edit-distance.svg`: original 600-dpi plotting rectangles from Schaeffer et al. (2023), *Are Emergent Abilities of Large Language Models a Mirage?*, arXiv:2304.15004v2, PDF page 5, Figure 3, right column (2-integer, 4-digit addition). Every original curve, shaded band, temperature comparison, and gridline is retained. Axis text is enlarged outside the unchanged plotting rectangles; tick locations are taken from the PDF geometry. The shared target-string-length and temperature legend is supplied by the slide. No data points were estimated, interpolated, or recreated.

## Important interpretation

The second Schaeffer panel plots **negative** token edit distance, exactly as published: movement toward zero indicates fewer edits. The paper's own arithmetic experiment scores the same model outputs under both metrics; it is not asserted to rescore the specific outputs in Wei et al.'s Figure 2. Its GPT-3/InstructGPT-family comparisons include 2-shot prompting, target-string lengths 1–5, and temperatures 0 and 1.

## Extraction geometry

Coordinates are PDF points measured from the top-left of a 612 × 792 point page. Pages were rendered at 600 dpi with Poppler.

- Wei 2A: (78.5, 104.5, 192.5, 233.5)
- Wei 2D: (426.5, 104.5, 540.5, 233.5)
- Schaeffer accuracy plotting rectangle: (372.915, 74.231, 456.223, 160.899)
- Schaeffer −edit-distance plotting rectangle: (372.518, 178.844, 456.220, 264.176)

Sources:
- https://arxiv.org/pdf/2206.07682v2
- https://arxiv.org/pdf/2304.15004v2

Downloaded source PDF SHA-256 (wei-2022): `f457f08102eb381f2300e1653bf4c82a9aa5dce0eb8dba8fe744ccc2500c3755`.

Downloaded source PDF SHA-256 (schaeffer-2023): `e3ecd65d314d8383d6e696abc9fa7a3fd58f79bf4e54e5f5bb0e46dd15faefc5`.

## Slide 11 readability adaptation

`wei-fig2a-arithmetic.svg` and `wei-fig2d-persian.svg` embed those unchanged PNG source crops at their original dimensions. Only the original title area (above all data) is replaced with the full title. Major vertical gridlines are placed at the exact published tick coordinates for 10^18, 10^20, 10^22, and 10^24 FLOPs; horizontal gridlines mark 0, 10, 20, 30, 40, and 50 percent. A background-only mask protects every original nonwhite pixel, including antialiased curves and markers. No experimental values or positions are changed. Baseline annotations are added in unoccupied space above the original dashed lines.

- PDF tick x coordinates, arithmetic: 110.97856, 132.18539, 153.39224, 174.59909 points.
- PDF tick x coordinates, Persian QA: 459.17656, 480.38339, 501.59024, 522.79709 points.
- Percentage tick y coordinates: 0% = 211.21686 points; 50% = 124.70239 points; linear interpolation gives the intervening published 10-point ticks.
- Baselines: arithmetic approximately 0%; Persian QA 25% (four answer choices). The Persian panel retains its original **exact match (%)** metric label.
- Four-choice format reference: https://github.com/google/BIG-bench/blob/main/bigbench/benchmark_tasks/parsinlu_qa/task.json

## Holtzman Figure 3 phrase excerpts for the decoding comparison

Slide 18 quotes 25 words total from the generated outputs in Holtzman et al. (2020), arXiv:1904.09751v2, Figure 3 (PDF page 4). The repeated phrase is shown twice with an ellipsis to indicate omitted intervening material. The other selections are short original phrases. Blue/red highlight identities are retained. The prompt-topic description and explanatory descriptions are explicitly paraphrases, not replacement model outputs. No new experimental text or scores are fabricated. The full nucleus continuation is imperfect and drifts from whales to birds.

Settings are preserved: beam width 16; pure sampling; temperature 0.9; top-k 640; nucleus p=0.95. The task table is contextual guidance informed by Shi et al. (2024), §4–6, Table 1 and Appendix I; it is not a universal ranking or a claim that every listed inference strategy was directly tested in that study.

Sources:
- https://arxiv.org/pdf/1904.09751v2#page=4
- https://aclanthology.org/2024.emnlp-main.489.pdf


## ICL research figures (current content slides 24–25)

These are direct rasterizations of original PDF plotting panels. No curves, values, bands, ticks, or legend entries were redrawn or moved. Crop rectangles below use PDF points from the upper-left corner.

- `garg-fig2-regression.png`: https://arxiv.org/pdf/2208.01066v3, PDF page 5, Figure 2 (complete plot and legend). Crop (155, 166, 456, 297), rendered at 400 dpi. Source PDF SHA-256 `6a8c536e9e1cad4f5afb732f192b1df486f71ce4b878388da63dfbcb2d9fc7e2`.
- `oswald-fig2-training.png`: https://proceedings.mlr.press/v202/von-oswald23a/von-oswald23a.pdf, PDF page 5, Figure 2 (left training-loss panel). Crop (57, 64, 175, 158), rendered at 400 dpi. Source PDF SHA-256 `bff905dee9e807afa1e1d12daf4dd0dee534bcfd9116dba42b24f3362f08ddb6`.

Garg: d=20, independent standard Gaussian coefficient vector and inputs, noiseless targets. The least-squares baseline uses the minimum-norm solution. Error is divided by d, averaged over 1,280 prompts; original bands are 90% confidence intervals from 1,000 bootstrap trials.

Von Oswald: one trained linear-self-attention layer compared with one-step GD on synthetic regression. The original GD reference and trained-model runs remain intact. This panel appears directly on content Slide 25 in the eight-slide redesign. Figure 2 was selected instead of Figure 1 to show the controlled empirical comparison; the figure substitution is explained in the speaker notes. The former matrix-construction drawer has been removed.

Additional foundations: Xie et al., https://arxiv.org/abs/2111.02080, §2–3, Condition 1 and Theorem 1; Akyürek et al., https://arxiv.org/abs/2211.15661, §3 Theorems 1–2 and §4 experiments. The Beta–Bernoulli and zero-initialized scalar-GD derivations are explicitly labeled pedagogical specializations.


## Eight-slide narrative update (October 2026)

`min-fig1-classification.png` is the unchanged top panel of Min et al. (EMNLP 2022), Figure 1, PDF page 1. Crop rectangle in PDF points from upper left: (305, 213, 521, 294). Rendered at 500 dpi. Original bars, axis range (25–65% macro-F1), model names and legend retained. The caption specifies classification and channel scoring. The full figure also includes a multiple-choice panel, which is not reproduced. No guessed data or reconstructed bar values. Source: https://aclanthology.org/2022.emnlp-main.759.pdf

Source PDF SHA-256: `9ca76d9f11855b715ab871a8c50e15bbf21b6bbb294d9e8fccaa99770f4f4c71`.

The document/concept diagram on content Slide 20 is a newly drawn adaptation of Xie et al. (2022), Figure 1, PDF page 2: shared concepts within a coherent pretraining document and across concatenated name/nationality examples. Its text and layout are new; it contains no experimental data. Source: https://arxiv.org/pdf/2111.02080

Recent-paper status verified against original sources: Riechers et al., arXiv:2505.18373v2 (2025 preprint); Akata et al., AISTATS 2026, PMLR 300; De Wynter, ICLR 2026 conference paper. The synthesis reports scoped GP-function and formal-task findings, not a universal mechanistic consensus.


## McCoy et al. (2024), Figure 3 top-left — current content slide 29

`mccoy-2024-fig3-rot13-output.png` is a direct high-resolution crop of the top-left Figure 3 panel on PDF page 5 of the published PNAS article, *Embers of autoregression show how large language models are shaped by the problem they are trained to solve*, 121(41), e2322420121. Original data points, log-probability coordinates, y-axis, model-series identities, legend, colors and ±1 SE bands are preserved; no points are recreated or repositioned. The article is CC BY 4.0. The 51% versus 13% GPT-4 comparison is reported in the abstract. Models: gpt-4-0613 and gpt-3.5-turbo-0613, temperature 0; 100 examples per condition. Output probability is estimated using GPT-2. These are historical results, not current-model performance.

Sources:
- https://doi.org/10.1073/pnas.2322420121
- https://cocosci.princeton.edu/papers/mccoy2024embers.pdf

Crop bounds in the published PDF page: x = 183/1196 to 418/1196 of page width; top y = 65/1600 to 285/1600 of page height. Rendered from the cropped PDF at 1400 pixels wide.


### ROT13 panel readability update

`mccoy-2024-fig3-rot13-output.svg` embeds the unchanged 1400 × 1311 original PNG crop. A white rectangle covers only the old x-axis title below y=1184 (outside all data and tick labels); the title is replaced by “Log probability of correct output.” A separate annotation, “More probable correct output →”, is added below the plot. All original data pixels, curves, error bands, tick positions, and legend entries remain unchanged. The original PNG remains available as the source.
