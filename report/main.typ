#import "@preview/ilm:1.4.1": *

#let piece = "Untitled"

#set text(lang: "en")
#show raw: set text(font: ("JetBrains Mono"), size: 9pt)

#show: ilm.with(
  title: [#piece],
  author: "Victor Quintana",
  date: datetime(year: 2025, month: 10, day: 18),
)

= Introduction

From an evolutionary standpoint, humans are extremely strange creatures.

Despite only accounting for \~2% of our body mass, a human brain consumes \~20%
of our energy. We are bipedal, and while it freed our hands for other uses made us
worse runners and more vulnerable to back problems. The complexity of our brains
meant we have extremely long developmental periods, where we needed to depend on
adults to live.

There are hundreds of species faster, nimbler, bigger, and certainly deadlier than us.
Most enjoy from extreme biological adaptations to their environment, giving them
exceptional stealth and speed. Yet, we are the dominating species. We established
presence in almost every corner of the world. It took eons for humanity to learn agriculture— but only
milennia later we sent people to the moon and back.

The greatest distinguishing factor might not be the size of our brains nor the dexterity
of our hands, but the way we think. We spend so much time growing up, being
defenseless, because it's an advantage to learn from passed down knowledge instead of having it
encoded in our DNA. It made us versatile enough to learn new things quickly, internalize them
as if they were always part of us, and pass them down to the next generation.

Our versatility left us room for expression, and creativity. Even with our hands alone we are able to transmit
endless amounts of knowledge. Place something into those hands, and knowledge is no longer
a limit. We were able to transcend our needs for survival. We chose to explore our world,
understand its nature, and create not for our survival, but for ourselves.

I have always been fascinated with art, especially instruments and music. I love the way human beings
can learn to play an instrument as a part of their own body. I love even more the fact
that our ears have apparently been designed with an attunement to music, to rhythms and harmony.
And what I love most about music, and art in general, is that it is a language: it transmits information, it has
certain rules, and it is unique to every culture, ethnicity, country or group of people.

Most people love art. But most people don't make it. I feel most people would like
to make art. Of course, picking up a pencil and learning to draw, or learning an instrument,
or in general learning to 'speak' the language of art takes both time and patience,
which most people don't have enough of. Some people don't even try. I want to change that.
I want to see what kind of art the average person can make, when given the chance to do so.
While I don't proclaim myself an artist, per se, I feel I can be an interpreter of sorts, using a computer
as my medium.

#pagebreak()

= Background

Visual art has been a part of humanity for a very, very long time. It has always been a space to explore diferent mediums, both
to put the art in (canvas, paper, cave walls), what the art is made of (oil-based paints with
dyes, objects, the shadows those objects cast), and the tools to make it (hands, fingers, brushes,
industrial machinery, and computers). It only took a few years since computers became generally available
to the general public in the 1960's for computer-based generative art to be created.
Several artists are considered the pioneers of this field, many of which served as inspiration
for my portfolio of works for this course.

== Vera Molnár

Vera Molnár was born in Hungaria in 1924. After studying aesthetics and art
history in the Hungarian University of Fine Arts, she moved to Paris. In 1960, she
began making drawings following specific algorithms, a method she called "machine imaginaire",
or "imaginary machine", referring to the fact she had not yet been able to
use an actual computer for the task.

In 1968, she finally got her chance after asking the head of computing at Paris University if she
could use their computers to make art. Their reaction was one of confusion, Molnár recalls, and was later
told by them that the reason she was granted her request was because of a famous quote:

#set quote(block: true)
#quote(attribution: [Voltaire])[
  I completely disagree with everything that you are saying but will defend until my death your right to do or say or write what
you have in mind.
]

Her works mainly involve the composition of simple shapes#sym.dash.em lines, squares, triangles.
By using simple rules, influenced by random values, the end result becomes more than just
the sum of its parts. She explores the blurry line between order and chaos.

#figure(
  image("letters-from-my-mother-volnar.jpg", width: 80%),
  caption: [#emph("Letters from my mother"), by Vera Molnár.],
)

== Manfred Mohr

Another pioneer in digital art, Manfred Mohr began programming his first computer drawings
in 1969, after being encouraged by an electronic music composer friend of his.

In 1971 he showcased his drawings in the Museum of Modern art in Paris, by feeding precalculated
data from a magnetic tape to a plotter. At that time it was not possible to have the computer make the
art in real time, as they needed special air conditioning and would be unfeasible
to transport to the museum.

#figure(
  image("demoPlotlg-mohr.jpg", width: 60%),
  caption: [An example of the plots shown at Mohr's show from May 11 - June 6, 1971]
)

== Sol LeWitt

LeWitt took another approach to algorithmic art. Instead of using a computer as the medium to
transform an algorithm to art, he used people.

In 1968, he began to create works of art by making instructions, sometimes accompanied by diagrams,
and getting people other than him to follow these instructions. These works would always be
done on a wall or walls of an exibition or public space, being painted over or taken down after
some time, to be reproduced elsewhere.

While the instructions do not explicitly include randomness compared to the previous
artists' works, LeWitt introduces randomness in the way people interpret his guidelines. According to
him, "each person draws a line differently and each person understands words differently."

#figure(
  image("wall-drawing-boston-museum-lewitt.jpg", width: 60%),
  caption: [Instructions for making #emph("Wall Drawing, Boston Museum") by Sol LeWitt]
)

Even long after his passing, new works of his are being created. All it takes are the
instructions, a couple people, and a wall.

= #piece

Like Sol LeWitt, I wanted to try and make the art a collaborative process, not just during
its creation. To this effect, I created a platform that can use the audience's mobile devices
to influence the piece, both in appearance and sound.

My intention was not only to make the piece more interesting, but observe how
people would react to having direct control over an art piece, and the sound it makes.
Would it make music? Would it be art?

== Implementation

The piece involves a webpage accessed from the participants' mobile phones, that
records the device's orientation and acceleration information. This data must
then be sent to and processed by a server. It is forwarded to the exibition's computer, which
uses this data to influence small artpieces and audio, each a 'sketch'. The exibition
cycles a set of these sketches periodically, keeping the theme of audience interaction.

The server uses Node.js with Express and Socket.IO to serve the webpage and connect
to clients. The exhibition computer is connected with authentication to ensure only one client
can display the artwork. Participants can connect to the server freely, through a direct link or
a QR code.

By using Javascript's native events, participants can interact with the work by touching the screen and rotating or
moving their phone. The way it interacts with the artwork and sound displayed
on the exhibition computer is determined by the specific 'sketch' active at the time.



