# Rechengeist

**Live page: https://janghaludu.github.io/rechengeist/** · [Paper (PDF)](paper/Ontology-Bound-Program-Synthesis.pdf)

A school-maths solver that runs entirely in your browser. A small language model reads your question and writes a short
program in Rechen-Lisp. An exact engine checks the program, solves it with rational arithmetic and writes the worked solution
with LaTeX. The app can refuse when it cannot check a program.

- Questions are processed in the browser and never leave the page.
- Choose a reader above the question box. Switching keeps your question in place so you can run it again with another reader.
  The browser downloads and caches model files on first use.
- There is an optional, off-by-default **Sound** control that plays a track from the author's own generative music (`audio/jala.m4a`, fetched only when you turn it on).
- The **Paper** tab of the page is the case-study write-up: *The Model Only Reads: Ontology-Bound Parsing with a Fail-Closed Exact Engine
  for School Mathematics*. The general method across six systems is the PDF in `paper/`: *Ontology-Bound Program Synthesis*.

## Choose a reader

| Reader | Weights | How it solves |
| --- | --- | --- |
| Large | Fine-tuned SmolLM2-135M, 115.7 MB | Reads the question into Rechen-Lisp for the exact engine. |
| Small | Transformer trained from scratch, 11.7 MB | Uses the same exact engine with a smaller download. |
| Small 11 · experimental | 11.7 MB native RGW1 model reconstructed in the browser from the Small weights and a ~0.65 MB edit file | Uses the tuned reader and an adaptive harness to select and check candidate interpretations. |

### How Small 11 works

The browser applies the native weight edits to the Small weights and verifies the resulting SHA-256 before loading them. The tuned reader writes a Rechen-Lisp program. The harness uses ontology rules to propose alternative interpretations and a fitted selector to rank them. On eligible questions it can also retrieve similar expression patterns using dot-product similarity over vectors and check the resulting expression with the exact engine. [Native weight edit file](small11/weight-edits.json)

The **Small 11 harness** panel shows its answer and the program it executed. The **Native reader result** below it shows what the tuned reader produced. Under **Inspect derivation**, you can see how the harness reached its answer. If a retrieved expression only verifies the numerical value, the panel flags the unit as unverified.

When the harness offers multiple checked quantities, choose the one you meant. That feedback helps it rank interpretations on later questions in the same browser. You can reverse a correction under **Correction history**. Feedback updates the local selector and the native model weights stay fixed during use.

## Repository files

- [`index.html`](index.html) contains the site and exact engine.
- [`models.json`](models.json) lists the reader files, sizes, SHA-256 digests and available evaluation figures.
- `rechengeist-small.weights` contains the Small model. The page joins the three Large weight parts and verifies their combined digest.
- [`small11/`](small11/) contains the Small 11 harness, fitted selector, retrieval vectors and weight edits.

Paths are relative for GitHub Pages and other static hosts. `.nojekyll` disables Jekyll processing.

## Original reader benchmarks

Right / wrong / refused percentages for Large and Small on the original hand-written evaluation sets. Each set was scored once with the page’s reader policy.

| Model | Held-back set (150) | Blind multi-step set (200) |
| --- | --- | --- |
| Large, fine-tuned SmolLM2-135M, 115.7 MB | 90.0 / 8.7 / 1.3 | 82.0 / 15.5 / 2.5 |
| Small, trained from scratch, 11.7 MB | 82.0 / 18.0 / 0.0 | 79.5 / 19.5 / 1.0 |

The program the reader wrote is shown beside the solution so you can check how the question was interpreted.

## Credits

Rechengeist is by Sriharsha Bangaru, Galleri5 Technologies Pvt. Ltd.
