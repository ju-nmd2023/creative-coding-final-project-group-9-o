#import "@preview/ilm:1.4.1": *

#let piece = "SoMoS"

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

I am reasonably confident that, like me, there are a lot of people that are very interested in art
but have mostly only engaged in it as the consumer; wanting to produce it but falling short on
time or motivation. I want my project to try and push people over that line, to show them
that they too should try and engage art from the other side, becoming the artist instead of
the audience.

The intended audience for my piece, then, are those who want to produce art, engage in creative
works, but never seem to find the confidence, time, or motivation to try and keep trying.


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

== Charles O'Rear

Charels O'Rear is a National Geographic photographer. In 1996, he took a picture
of green hills in California. According to some journalists, it's the most
viewed photograph in the world. It is the default wallpaper for Windows XP.

It is an iconic photograph, embedded deep in internet culture. I grew up with this
picture. It reflects peace, serenity, bliss. I thought it would be the perfect setting
for an art piece.

#figure(
  image("bliss.png", width: 60%),
  caption: [#emph("Bliss") by Charles O'Rear]
)

== Aesthetic Theory

=== Impressionism
Impressionism emerged as an art movement in the late 19th century, as several independent
painters began painting scenes in the open air, instead of closed studios, in quick, 'broken' brush
strokes, that allowed them to capture ephemeral details in a scene, like the sun's light and
its effects on the landscape.

Impressionist paintings emphasize the colors and light of a scene, over details, lines
and contours. The result is an aesthetic unlike any of the time; capturing the beauty of sunshine,
the colors of nature, focusing on the overall atmosphere of the subject instead of maximizing
realism and detail.

#figure(
  image("Alfred_Sisley_001.jpg", width: 60%),
  caption: [#emph("View of the Canal Saint-Martin") Alfred Sinsley]
)

=== Minimalism

Minimalism seeks to represent a subject in its essence, the smallest possible representative
elements, after removing all non-essential concepts or details. Some minimalist artists have stated that their works are explicitly 'objective', stripped of
all self-expression.

Minimalism, and other post-modern art movements, are more greatly open to interpretation, compared to eariler styles and aesthetics. When there is
minimal information conveyed in the work, many people will inject their own in their interpretation.
It could be argued that each person sees a slightly different piece, changed by their personal
experiences, opinions, and morals.

#figure(
  image("TheBeatles68LP.jpg", width: 60%),
  caption: [Cover of The Beatles' #emph("White Album"), by Richard Hamilton]
)

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

The server uses Node.js with Express and websockets to serve the webpage and connect
to clients. The exhibition computer is connected with authentication to ensure only one client
can display the artwork. Participants can connect to the server freely, through a direct link or
a QR code.

By using Javascript's native events, participants can interact with the work by touching the screen and rotating or
moving their phone. The way it interacts with the artwork and sound displayed
on the exhibition computer is determined by the specific 'sketch' active at the time.

In the turned in version, anyone can create their own instance of the artwork, and connect to with a QR code.

The sketch displayed on the main computer is a field, with generative hills. I implemented a day/night cycle by rotating around
a sun and moon, and blending different colors in the background to create pretty lighting for the sky. At night stars fade in and twinkle
as the moon moves. A pinhweel sits embedded in the grass.

For the sound, I used a custom polyphonic synthesizer for a background drone, that plays a series of chords. When the user taps on their
phone, the next chord in the sequence is played. The pinwheel plays an arpeggio of the chord when spun, by blowing on the phone's microphone.
Shaking the phone applies some force to the pinwheel which moves back and forth like a spring. Rotating the phone will change the time of day,
applying a filter and changing the waveform of the drone synth.

The phone also has a sketch of its own, showing the phone's rotation with a cube at the center, and dots in concentric rings spinning around
it as you blow into the microphone. The sketch has the singular purpose of showing feedback to the sensor data.

== Screenshots
#figure(
  image("somos_phone.png", width: 60%),
  caption: [Phone interface]
)
#figure(
  image("somos_stage.png", width: 60%),
  caption: [SoMoS main sketch]
)

= Discussion

The end result of this work was a piece that combines several art movements. The main sketch is
a landscape represented by simple lines and colors. For an impressionist style, I wanted light to play
a big part in evoking a feeling of peace and beauty, so I designed gradients that would
shift as the sun and moon rotated around the scene. The light affected the outlines
of the hills so that the scene would feel coherent.

The phone's sketch is a different style. I wanted something in the minimalistic and abstract style to show the 'player'
direct feedback of their actions. The cube in the middle shows the rotation of the phone, and
the rotating dots spin if the microphone is blown at. Every element of the scene has this purpose.

My original intention was to make a piece that would focus on the sound, placing a higher responsibility on the participant to create
music. However, over the course of development the idea shifted into making an interactive art piece, focusing on the novel use of a phone
to interface with the piece. While I don't inherently regret that, I would've liked to make an actual collaborative art piece like
Sol LeWitt.

I saw other people's works implemented their inspirations more explicitly into their work. While I adapted some techniques of my inspirations,
especially the use and transformation of noise, I took my own direction when it came to the spirit and intention of the piece. Most of the artists
I used for inspiration in my portfolio defined their works by the algorithm used to draw them. I, on the other hand, started with a vision for
a scene and used whatever means necessary to render it to the screen. Not a lot was 'generated', per se, rather it was drawn according to
hard-coded specifications. This original vision was inspired by Charles O' Rear's picture, #emph("Bliss"). 

