#let data = yaml(sys.inputs.data)
#let font = ("Helvetica Neue", "Arial")
#let accent = rgb("#1f4e5f")
#let ink = rgb("#1c1f23")
#let muted = rgb("#6b7280")
#let rule = rgb("#e3e6ea")
#let tint = rgb("#f4f6f8")
#let palette = (
  (fg: rgb("#4b5563"), bg: rgb("#eceef1")),
  (fg: rgb("#1d4ed8"), bg: rgb("#e3ebfd")),
  (fg: rgb("#6d28d9"), bg: rgb("#ece6fb")),
  (fg: rgb("#0f766e"), bg: rgb("#d9f1ee")),
)
#let levels = data.at("levels", default: ())
#let gaps = data.at("gaps", default: ())
#let asks = data.at("asks", default: ())

#let chip(name, level, size: 7.2pt) = {
  let i = if level == none { none } else { levels.position(l => l == level) }
  if i == none {
    box(stroke: 0.5pt + muted, radius: 2pt, inset: (x: 4pt, y: 2pt),
      text(size: size, fill: muted, weight: "medium", name))
  } else {
    let c = palette.at(calc.min(i, palette.len() - 1))
    box(fill: c.bg, radius: 2pt, inset: (x: 4pt, y: 2pt),
      text(size: size, fill: c.fg, weight: "medium", name))
  }
}
#let label(t) = text(size: 8pt, fill: accent, weight: "bold", tracking: 0.08em, upper(t))

#set page(paper: "a4", margin: (x: 16mm, y: 14mm))
#set text(font: font, size: 9pt, fill: ink)
#set par(leading: 0.55em, spacing: 0.8em)

#grid(columns: (1fr, auto), align: (left + bottom, right + bottom),
  {
    text(size: 8pt, fill: accent, weight: "bold", tracking: 0.08em, upper[Performance review])
    v(-2pt)
    text(size: 22pt, weight: "bold", data.name)
  },
  text(size: 8.5pt, fill: muted, align(right)[
    #data.role, #data.level#if "employer" in data [ · #data.employer] \ #data.period
  ]),
)
#v(-2pt)
#line(length: 100%, stroke: 1.2pt + accent)
#v(6pt)

#for s in data.summary {
  grid(columns: (10pt, 1fr), column-gutter: 0pt,
    text(fill: accent, weight: "bold", sym.bullet), text(size: 10.5pt, s))
  v(-0.2em)
}
#v(4pt)

#if levels.len() > 0 {
  set text(size: 7.5pt, fill: muted)
  [Level key: ] + levels.map(l => chip(l, l)).join(h(4pt))
  v(6pt)
}

#show table.cell: set block(breakable: false)
#table(
  columns: (44%, 28%, 28%), stroke: none, inset: (x: 4pt, y: 5pt),
  align: left + top,
  table.header(
    table.cell(fill: ink, inset: 5pt, text(size: 7.5pt, fill: white, weight: "bold")[Work]),
    table.cell(fill: ink, inset: 5pt, text(size: 7.5pt, fill: white, weight: "bold")[Result]),
    table.cell(fill: ink, inset: 5pt, text(size: 7.5pt, fill: white, weight: "bold")[Shows]),
  ),
  ..for t in data.themes {
    (
      table.cell(colspan: 3, fill: tint, inset: (x: 5pt, y: 4pt), stroke: (bottom: 1pt + accent),
        text(size: 8pt, fill: accent, weight: "bold", tracking: 0.06em, upper(t.name))),
      ..for e in t.examples {
        let sub = if "client" in e { [#e.client · #e.date] } else { [#e.date] }
        let shows = e.at("shows", default: ())
        (
          table.cell(stroke: (bottom: 0.5pt + rule), [*#e.title* \ #text(size: 7.8pt, fill: muted)[#sub]#v(3pt)#text(size: 7.8pt, fill: muted)[#e.detail]]),
          table.cell(stroke: (bottom: 0.5pt + rule),
            if "result" in e { text(size: 8.3pt, e.result) } else { text(fill: muted, sym.dash.em) }),
          table.cell(stroke: (bottom: 0.5pt + rule),
            shows.map(s => chip(s.name, s.at("level", default: none), size: 6.8pt)).join(h(3pt, weak: true))),
        )
      }
    )
  }
)

#if gaps.len() > 0 or asks.len() > 0 {
  v(10pt)
  let gaps-col = {
    label[Gaps]
    v(3pt)
    set text(size: 8.5pt)
    for g in gaps {
      [*#g.name*#if "note" in g { text(fill: muted)[: #g.note] }]
      linebreak()
    }
  }
  let asks-col = {
    label[For our 1:1]
    v(3pt)
    set text(size: 8.5pt)
    for (i, a) in asks.enumerate() {
      [*#(i + 1). #a.title* \ #text(fill: muted)[#a.text]]
      v(0.3em)
    }
  }
  let cols = if gaps.len() > 0 and asks.len() > 0 {
    ((1fr, 1.3fr), (gaps-col, asks-col))
  } else if gaps.len() > 0 {
    ((1fr,), (gaps-col,))
  } else {
    ((1fr,), (asks-col,))
  }
  block(breakable: false, width: 100%, grid(columns: cols.at(0), column-gutter: 16pt, ..cols.at(1)))
}
