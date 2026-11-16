# Rechengeist

**Live page: https://janghaludu.github.io/rechengeist/** · [Paper (PDF)](paper/Ontology-Bound-Program-Synthesis.pdf)

A school-maths solver that runs entirely in your browser. A small language model reads your question and writes a short
program in Rechen-Lisp; an exact engine checks the program, solves it with rational arithmetic and writes the worked solution
with LaTeX. If anything does not check out, it refuses and says why instead of guessing.

- Nothing is sent to a server. Questions never leave the page.
- On your first visit you choose a model (Small, about 12 MB, or Large, about 116 MB). It is downloaded once, stored in your
  browser (Cache Storage) and loaded from there on every later visit.
- There is an optional, off-by-default **Sound** control that plays a track from the author's own generative music (`audio/jala.m4a`, fetched only when you turn it on).
- The **Paper** tab of the page is the case-study write-up: *The Model Only Reads: Ontology-Bound Parsing with a Fail-Closed Exact Engine
  for School Mathematics*. The general method across six systems is the PDF in `paper/`: *Ontology-Bound Program Synthesis*.

Files: `index.html` (the whole page), `models.json` (sizes, SHA-256 and evaluation numbers of each model), `rechengeist-small.weights`,
and `rechengeist.weights.part0` ... `part2` (the large model, split because GitHub rejects files over 100 MB; the page joins them
and checks the SHA-256). `.nojekyll` switches off Jekyll processing. All links are relative, so the folder works from
`https://<user>.github.io/<repo>/` or any other static host.

## Numbers

Right / wrong / refused on hand-written problems, each set scored once (page policy, which tries beam alternatives only after a refusal):

| Model | Held-back set (150) | Blind multi-step set (200) |
| --- | --- | --- |
| Large, fine-tuned SmolLM2-135M, 115.7 MB | 90.0 / 8.7 / 1.3 | 82.0 / 15.5 / 2.5 |
| Small, trained from scratch, 11.7 MB | 82.0 / 18.0 / 0.0 | 79.5 / 19.5 / 1.0 |

Wrong answers are real: about one problem in ten on the held-back set, and more on multi-step problems. The program the model wrote is shown beside every
solution so you can check how the question was read.

## Credits

Rechengeist is by Sriharsha Bangaru, Galleri5 Technologies Pvt. Ltd.
