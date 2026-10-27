#import "@preview/cmarker:0.1.10": render

#set page(paper: "a4", margin: 2.2cm)
#set text(font: "Libertinus Sans", size: 10.5pt)
#set par(leading: 0.7em)
#show heading.where(level: 1): set text(size: 20pt)
#show heading.where(level: 2): set text(size: 14pt)
#show heading.where(level: 3): set text(size: 11.5pt)
#show heading: set block(above: 1.4em, below: 0.8em)

#render(read(sys.inputs.md))
