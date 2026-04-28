Adaptive Temporal Scaling in Space–Time Cubes for Bursty
Spatio-Temporal Data

Clinton Emok*
TU Eindhoven

compressed and cluttered.

The Space–Time Cube (STC) (see Figure 1), a foundational con-
cept in geovisualization [17], offers a spatiotemporal representation
by mapping two spatial dimensions to the horizontal plane and
time to a third dimension. Although traditionally rendered as a 3D
environment, STC-inspired techniques also include flattened 2D pro-
jections that retain temporal continuity [6]. However, these systems
almost universally assume a linear, uniform time axis.

From a cognitive perspective, this rigidity imposes a significant
burden on the analyst. In linear STC visualizations of bursty data,
the user is often forced to zoom or scroll to inspect compressed
temporal bursts. This repeated navigation fragments the viewing
experience and requires analysts to continually re-establish how the
inspected moment relates to the overall temporal pattern. Sweller’s
Cognitive Load Theory (CLT) shows that problem-solving situations
involving continual search and reorientation consume substantial
working-memory resources that would otherwise support deeper
understanding of the material [36]. In CLT terms, this navigation
overhead constitutes extraneous cognitive load: mental effort spent
managing the interface rather than making sense of the data.

CLT also identifies germane cognitive load, which refers to the
mental effort directly devoted to interpreting, organizing, and inte-
grating information into a coherent understanding of the data [27].
Germane load is beneficial, but only when extraneous load is low
enough for working-memory resources to be used productively. Paas
et al. emphasize that effective design should therefore minimize un-
necessary cognitive effort so that users can focus on meaningful data
interpretation. By strictly adhering to a linear time axis, traditional
STC encodings prioritize metric precision over cognitive efficiency
and inadvertently increase extraneous load, leaving less capacity for
germane processing of the data.

These limitations motivate a reconsideration of how time itself is
represented in spatialtemporal visualizations. Instead of treating time
as a constant sequence of uniform timeslices, this project explores
non-linear and segment-aware temporal scaling, in which the visual
height of a timeslice adapts to the underlying activity. This approach
builds upon established focus+context frameworks [8], which aim to
”decrease the short term memory load associated with assimilating
distinct views” by integrating the focus seamlessly within its context.
By expanding high-density periods and compressing low-density
ones, the visualization targets a reduction in the extraneous load
caused by clutter. Integrating such adaptive temporal modeling into
an STC-inspired system may improve clarity and help non-technical
users understand spatialtemporal patterns more effectively.

The goal of this research is therefore to investigate how burstiness-
aware temporal scaling can enhance the interpretability of STC-
inspired visualizations. By designing and evaluating a hybrid 2D and
3D prototype, this study examines whether adaptive representations
of time can successfully reduce extraneous cognitive load without
compromising the user’s ability to perceive temporal order and
duration.

2 PROBLEM STATEMENT

Bursty spatiotemporal datasets contain highly uneven distributions of
events, yet most visualization techniques, including both 3D space-
time cubes and 2D projections, represent time as a uniform linear

Figure 1: Space-time cube visualization of Napoleon’s 1812 Rus-
sian campaign, showing the army’s movement across geographic
space (x-y plane) and through time (vertical axis). Locations along
the trajectory are annotated to illustrate how spatial position and tem-
poral progression are co-registered within a single 3D representation.
Source: ITC Cartography.

1 INTRODUCTION

Spatialtemporal datasets play a central role in domains such as mo-
bility analysis [11], crime monitoring [26], and epidemiology [28].
Analysts in these areas increasingly rely on data that unfolds over
space and time, often without having specialized training in visual-
ization. Their challenge is not to experiment with visual encodings
but to quickly interpret patterns, identify meaningful moments, and
make informed decisions.

A common difficulty in these datasets is burstiness: the degree of
variability in a temporal process, reflected in the frequency, intensity,
and spacing of sudden spikes in activity. Burstiness is prevalent in
many real-world processes and complicates visual analysis because
events occur at uneven and unpredictable intervals. This irregularity
renders uniform timeslices inefficient, as they allocate equal screen
space to unequal information densities. Consequently, long periods
of inactivity stretch the visual representation without adding mean-
ingful information, while dense bursts of events become visually

*e-mail: c.emok@student.tue.nl

This project addresses these challenges by investigating non-
uniform, burstiness-aware temporal scaling within STC visualiza-
tions, with the aim of improving the interpretability and usability of
irregular spatiotemporal data.

2.1 Research Questions

The project is guided by the following central research question:

How can the Space-Time Cube (STC) be redesigned to
better support the interpretation of bursty spatiotemporal
data?

2.2 Research Objectives

Research Objective 1: Temporal Modeling
To develop a non-uniform temporal scaling approach that can rep-
resent bursty spatiotemporal data within the STC. This involves
exploring temporal transformations that adapt to irregular event den-
sity while preserving temporal ordering and the user’s ability to
accurately read temporal intervals and patterns.

Research Objective 2: Interpretability Assessment

To assess how a non-uniform temporal axis affects users’ ability to
identify, compare and interpret irregular temporal patterns in bursty
datasets, and to determine whether adaptive temporal encoding en-
hances sensemaking relative to a uniform axis.

Research Objective 3: Usability and Experience Evaluation
To evaluate the clarity, cognitive load and overall usability of an STC
implementation incorporating non-uniform temporal scaling, with
particular attention to non-expert users. This objective investigates
how users perceive and reason with the adapted temporal model in
practical analytical tasks.

3 STATE OF THE ART

3.1 Visualizing Spatiotemporal Data

Visualizing data that varies across both space and time is a long-
standing challenge in information visualization and geographic in-
formation science. Spatiotemporal datasets arise in domains such
as traffic monitoring, epidemiology and crime reporting [3, 26, 29].
The core challenge lies in representing two spatial dimensions and
one temporal dimension in a way that supports human interpretation
without overwhelming cognitive resources.

Several visualization approaches have been developed to address
this challenge, each offering different trade-offs between spatial
fidelity, temporal coherence, and cognitive load [6]:

1. Static 2D Maps with Temporal Encoding

These approaches apply time cutting or time flattening opera-
tions that project temporal information onto a static 2D spatial
layout. Time is encoded indirectly through visual variables
such as color, size, or symbols [22] as shown in Figure 3.
Strengths: Highly accessible; preserve full spatial structure.
Limitations: Collapse temporal evolution into a single frame,
obscuring sequences, rhythms, and trends.

Figure 2: Stacking-based STC visualization of San Francisco traffic
trajectories, adapted from Tominski et al. (2012). Time is encoded
vertically, spatial position on the map, and color denotes speed.

axis. This fixed temporal encoding compresses periods of intense
activity and stretches long idle intervals, distorting the underlying
temporal structure and making meaningful segments difficult to
compare. Existing systems address dense data through filtering,
aggregation, or guidance techniques, but these approaches do not
resolve the core limitation: the temporal axis itself does not adapt to
irregular event density.

As a result, bursty datasets often remain visually distorted, and
users struggle to understand when important changes occur. De-
signing temporal representations that reflect irregular event density,
while remaining intuitive and interpretable, therefore remains an
open and challenging research problem.

Although the space-time cube (STC) is theoretically well suited
for unifying spatial and temporal information [6, 17], its practical
uptake is limited. Usability studies report perceptual complexity,
navigation overhead, and difficulties interpreting dense or irregular
temporal patterns [18], particularly among non-expert users who are
unfamiliar with 3D navigation or spatiotemporal mental models.

Evaluations of STC-based systems highlight several recurring

obstacles:

• Users often do not understand why certain intervals or tra-
jectory segments appear visually compressed or more promi-
nent [12].

• Irregular patterns are difficult to interpret when time is encoded

uniformly.

• Dense trajectories lead to overplotting and clutter, obscuring
fine-grained detail unless additional filtering or interaction
techniques are applied [38] as seen in Figure 2.

These limitations create a broader interpretability gap: even when
users notice potential patterns, they may remain unsure about their
reliability or meaning. Without improvements in burstiness handling
and user-centered interpretability, the STC is likely to remain an
expert-oriented technique with limited accessibility.

Figure 3: Two visualizations using colored time flattening. (a) Illus-
tration of a dynamic graph visualization as used in GEVOL [9]. (b)
Stroke order in Chinese characters [42]; the color legends have been
added.

2. Animated Maps and Time Sliders

Animated time cutting presents temporal slices sequentially,
either through automatic playback or via interactive sliders [7,
14]. Example from Tempovis shown in Figure 4 Strengths:
Intuitively conveys short-term temporal change and supports
narrative explanations. Limitations: Requires users to mentally
integrate information across frames, increasing cognitive load
and reducing recall accuracy [5, 31].

Figure 4: TempoVis: Navigating through time using a time-slider
interface

3. Coordinated Multiple Views (CMV)

CMV systems distribute spatial and temporal information
across multiple linked displays— typically a map combined
with timelines, histograms, or attribute plots—and synchro-
nize them through brushing and filtering in Figure 5 [23, 30].
Strengths: Reduce occlusion by separating dimensions; sup-
port detailed analytical tasks through coordinated interactions.
Limitations: Users must mentally connect information across
separate views, increasing cognitive effort because spatial and
temporal patterns are not shown in a single, unified display. [2]

Figure 5: Coordinated multiple views interface illustrating linked map,
scatterplot, and attribute views. Selections in one view propagate to
the others, supporting exploratory analysis.

4. Space-Time Cube (STC)

The STC corresponds to a 3D space-time embedding, mapping
two spatial dimensions onto a horizontal plane and time onto a
vertical axis [13, 17]. Strengths: Co-registers space and time
within a single visual structure, supporting reasoning about
movement, concurrency, and temporal rhythm [6]. Limitations:
Susceptible to occlusion, depth ambiguity, and navigation com-
plexity, particularly for dense or irregular datasets [18, 38].

While each technique contributes valuable capabilities, they all

involve significant trade-offs:

• 2D static approaches are accessible but compress or obscure

temporal structure.

• Animations convey temporal flow but place heavy demands
on working memory and hinder accurate comparison across
moments in time.

• Coordinated Multiple Views reduce occlusion through linked
displays but require users to mentally integrate information
across views, increasing cognitive effort.

• The STC co-registers space and time within a unified represen-
tation but introduces perceptual and interaction challenges

3.2 The Space-Time Cube and Its Variants
The space-time cube (STC) is one of the most widely studied tech-
niques for integrating spatial and temporal dimensions in a single
visual representation. Originally proposed in the context of time
geography [13] and later adapted for geovisualization [17], the STC
encodes two spatial dimensions on a horizontal plane and maps
time to the vertical axis. This design allows individual trajectories
or events to be visualized as continuous three-dimensional paths,
potentially revealing concurrency, movement patterns, and temporal
rhythm [6].

A key strength of the STC is its ability to merge spatial and
temporal information into a single coherent representation. Whereas
timelines abstract away geographic detail and static maps collapse
temporal variation, the STC preserves the progression of time while
retaining full spatial context. This integrated structure allows users
to directly observe spatial relationships at specific moments, detect
recurring temporal patterns, and interpret movement directionality
within the unified 3D space.

Over the past two decades, researchers have proposed several

enhancements to the original STC concept. These include:

• Interaction techniques such as rotation, zooming, slicing, and
filtering have been introduced to reduce occlusion and facilitate
exploration of patterns within the cube [18, 38]. These tech-
niques can be aligned with the user intents identified by Yi et
al. [45], such as Explore (zooming and panning), Filter (hiding
data based on criteria), and Abstract/Elaborate (slicing through
time or space). This framing emphasizes that interaction is not
merely a navigation aid but a core mechanism through which
users gain insight in spatiotemporal environments.

• Projection-based adaptations, including 2.5D and hybrid
layouts, which flatten or abstract certain dimensions to simplify
interpretation [6].

• Attribute-encoded trajectories,

in which non-spatial at-
tributes are encoded through visual variables such as color, line
thickness, or glyphs along the space-time trajectory [32, 38].

Despite these advancements, most STC-based systems still as-
sume relatively high user fluency with spatial reasoning and 3D
interaction. As noted in usability studies [18], users frequently
struggle with depth ambiguity, occlusion, and the added cognitive
demands of interpreting 3D views. These issues become especially
problematic in dense or bursty datasets, where trajectories over-
lap or converge, making patterns difficult to isolate without expert
interaction skills.

While STC variants have pushed technical and aesthetic bound-
aries, comparatively few systems have prioritized interpretability,
learnability, and trust—particularly for non-expert users operating in
real-world contexts. The next section explores how these usability
gaps have been evaluated and what open challenges remain in bring-
ing STC-inspired visualizations to broader professional audiences.

3.3 Prior Evaluations of the Space–Time Cube (STC)

To date, most empirical evaluations of the STC have compared it
against equivalent 2D interactive maps or animations, examining
possible advantages or disadvantages across different types of an-
alytic tasks. Early and more recent studies converge to a nuanced
conclusion: the STC does not consistently outperform 2D represen-
tations, but it can yield benefits for specific, higher-level reasoning
tasks.

One of the first systematic comparisons was conducted by Kris-
tensson et al. [18], who evaluated the STC with 30 novice users
performing four categories of tasks derived from Andrienko et al. [4]
’s typology, using a campus mobility dataset. For simple localiza-
tion questions (e.g. Where is the red person at 2pm?), participants
made fewer errors on a 2D interactive map. However, for more
complex queries involving temporal comparison or duration (e.g.
Who remained on campus longest?), the STC achieved comparable
accuracy with roughly half the response time. These results suggest
that the cube’s combined spatialtemporal encoding makes it easier
for users to understand relationships and patterns over time, but it
also adds extra effort when users need to perform simple, precise
spatial lookups.”

Amini et al. [1] performed a similar experiment with their Space-
Time Visualizer, comparing an STC-based environment with a 2D
map across 12 participants and a new set of tasks. While error rates
did not differ significantly, completion times were shorter in the STC
condition for identifying meetings or stationary moments. They also
observed that participants spent a substantial portion of their time
rotating the cube, likely leveraging structure-from-motion cues to
resolve depth ambiguity.

In a maritime domain context, Willems et al. [43] compared the
STC to animated and density-based 2D representations for visual-
izing vessel traffic under varying levels of clutter. Their study with
17 participants found that density maps performed best for most

tasks, with the STC only outperforming alternatives when partici-
pants were asked to identify the traffic lane with the highest vessel
count. Similarly, Kveladzee et al. [19, 20] conducted a sequence of
expert evaluations integrating the STC with coordinated 2D views.
Although the STC was consistently the most frequently used view,
experts reported a steep learning curve and visual clutter as major us-
ability barriers. Follow-up experiments exploring color and shading
variables confirmed that color aids grouping of trajectories, whereas
depth shading may amplify clutter.

More recently, Filipov et al. [12] extended this line of research
with Timelighting, a guidance-enhanced visual analytics approach
designed to overcome the perceptual and interactional limitations of
traditional STC views. Building on the STC concept for temporal
networks, the system projects trajectories into a 2D plane while
retaining temporal continuity through opacity, color, and movement
cues. Through two expert case studies and a heuristic evaluation us-
ing the ICE-T framework [40], the authors found that their approach
improved interpretability and insight discovery compared to con-
ventional STC and animation techniques. However, they also noted
persistent scalability constraints and visual clutter for dense tempo-
ral data, reaffirming longstanding usability challenges associated
with STC-based representations.

Across these studies, a consistent pattern appears: users perform
better with the STC when they need to interpret trends over time,
compare temporal behaviors, or understand how events evolve. In
contrast, 2D views are faster for tasks that require pinpointing exact
locations or reading precise spatial values. These differences arise
because the STC makes it harder to judge precise positions due to
depth, occlusion, and extra navigation, even though it helps users
see broad temporal patterns

3.4 Handling Bursty Spatiotemporal Data

Prior work in dynamic graph visualization demonstrates that uniform
timeslicing “implicitly assumes that all events will be uniformly dis-
tributed across time,” an assumption that rarely holds in real-world
datasets, as shown by Wang et al. [41]. Their analysis illustrates that
when this assumption breaks, dense intervals become overpopulated
with events while sparse intervals remain visually empty, producing
clutter in high-activity periods and wasted space elsewhere. This im-
balance makes it difficult for users to perceive meaningful temporal
structure, particularly when bursts dominate the event distribution.
To mitigate these effects, researchers have explored adaptive tem-
poral segmentation methods that adjust slice boundaries according
to event density. Visualization-driven approaches explicitly seek to
“balance the visual complexity across timeslices,” allocating more
slices to high-activity intervals and fewer to low-activity ones. Jung
et al.’s recent survey identifies this imbalance as a core limitation of
uniform segmentation, emphasizing that a fixed interval “falls short
of accommodating the variable density and other real-world dynam-
ics intrinsic to these networks” [15]. They highlight a growing body
of hybrid methods that combine statistical change detection, tempo-
ral clustering, and perceptual stability constraints. Such approaches
have been shown to reduce visual clutter, reveal fine-grained tem-
poral patterns, and avoid generating slices that are either empty or
overloaded.

A complementary line of research removes the notion of times-
lices entirely by adopting continuous-time representations. Simon-
etto et al. introduce DynNoSlice, an event-based system that embeds
nodes and edges directly into the space–time cube using real-valued
timestamps [35]. Their findings show that the imposition of discrete
temporal bins “can induce instability,” since the chosen granularity
may either obscure important microtemporal variations or introduce
unnecessary computational and visual overhead. By preserving tem-
poral continuity, DynNoSlice avoids arbitrary partitioning choices
and maintains the fidelity and smooth temporal evolution of event
sequences.

The design study approach emphasizes a close link between prob-
lem characterization, solution design and evaluation ensuring that
each stage directly informs the next. The iterative cycle will involve
sketching and low-fidelity mock-ups, implementation of a functional
prototype and subsequent usability testing with representative users.
To structure the design and validation process, the research also
draws on Muzner’s nested model for visualization design and evalu-
ation [24], which distinguishes between four interdependent levels:

• Level 1: Domain problem and data characterization

• Level 2: Operation and data-task abstraction

• Level 3: Encoding and interaction design, and

• Level 4: Algorithm and implementation

The design and evaluation activities will primarily focus on levels
2 and 3, where appropriate visual and interaction are selected to
support key analytical tasks.

The empirical evaluation will be informed by Lam et al.’s [21]
taxonomy of evaluation scenarios in information visualization, com-
bining usability testing and insight-based evaluation to understand
both effectiveness and user experience. This combination allows
assessing not only performance metrics such as task completion and
accuracy, but also perceived intuitiveness,confidence, and overall
trust in the visualization.

Overall, this approach ensures that both theoretical grounding and
practical evaluation contribute to understanding how non-technical
professionals engage with STC visualizations and what design prin-
ciples enhance interpretability

4.2 Target Users and Data Context

4.2.1 User Definition: Technically Literate Novices

Participants will be recruited from the TU Eindhoven student body
as technically literate novices: users who are comfortable with
digital tools but have little prior exposure to advanced spatiotemporal
visualizations. This sampling strategy aligns with the evaluation
methodology for Space-Time Cubes established by Kristensson et
al. [18]. They argue that validating the STC with novices serves as a
necessary “empirical building block,” reasoning that if users without
domain expertise can effectively interpret complex spatiotemporal
patterns, it is highly probable that expert users will achieve equal
or greater proficiency. Furthermore, recruiting novices eliminates
the confounding variables associated with expert users, who often
possess varying levels of proficiency with legacy visualization tools
that makes baseline comparisons difficult.

4.2.2 Data Context: Chicago Crime as Use Case

To provide a realistic and analytically meaningful test environment,
the prototype will use the Chicago Crime Dataset as its application
context. This dataset is well-suited for evaluating adaptive temporal
scaling because it naturally exhibits the temporal irregularity and
spatial density highlighted in the problem statement.

• Burstiness: Crime events fluctuate sharply across hours, days,
and seasons, creating dense clusters of activity followed by
long gaps. This makes the dataset well-suited for assessing
whether adaptive temporal scaling improves the readability of
irregular temporal structures.

• High Spatiotemporal Resolution: The dataset contains more
than seven million records with precise timestamps and ge-
olocations, providing a realistic setting for testing the proto-
type under conditions typical of large, dense spatialtemporal
datasets.

Figure 6: Interactive lens interface showing a bimanual touch interac-
tion. One hand positions and resizes the lens, while the other hand
explores the filtered and magnified data within the lens interior. This
design enables localized inspection of dense spatial regions without
disrupting the global map context. [16]

Beyond temporal segmentation, researchers have also explored
local, interaction-driven methods for managing clutter in dense re-
gions. A prominent class of such approaches is interactive lenses,
which “temporarily alter a selected part of the visual representation”
to reveal hidden structure or reduce occlusion [37]. Lenses operate
through a user-defined selection (see 6), a lens function that trans-
forms the selected content, and a reintegration step that merges the
modified and unmodified regions. Several lens types are relevant
to bursty spatiotemporal data: clutter-reducing lenses can filter or
abstract dense event clusters; layout lenses can temporarily separate
overlapping trajectories; and encoding lenses can apply alternative
visual variables to enhance fine-grained temporal differences. These
tools provide flexible, on-demand focus+context enhancements that
can help analysts inspect local details within otherwise cluttered
temporal intervals.

However, despite their usefulness, lenses remain fundamentally
insufficient for addressing burstiness in the Space-Time Cube. Their
effects are inherently local and temporary: lenses do not modify the
underlying temporal axis and therefore cannot resolve the global
compression of high-density intervals caused by uniform time en-
coding. Users must manually reposition lenses to inspect different
portions of a burst, increasing cognitive and interactional overhead.
Moreover, because lenses reveal patterns only within their bounded
region, they do not help users perceive the overall temporal rhythm
or identify where bursts occur in the first place. As a result, lenses
address the symptoms of temporal burstiness, local clutter and over-
lap—rather than its structural cause: the mismatch between event
density and the visual representation of time.

Taken together, these limitations create a clear need for design
and algorithmic strategies that go beyond localized adjustments. To
better support the interpretation of bursty spatiotemporal data, the
Space-Time Cube requires approaches that can address the global
distortions introduced by irregular event density, rather than treating
only the symptoms through temporary, local interventions.

4 METHODOLOGY

4.1 Research Approach

The research will most likely build on the design study methodology
as proposed by Sedlmair et al. [33], which is particularly suited
to visualization research aiming to address domain-specific chal-
lenges through the creation and evaluation of tailored tools. Within
this framework, the study will iteratively design, implement and
assess a prototype that visualizes spatiotemporal data using the STC
paradigm.

• Semantic Familiarity: Event categories such as theft, bur-
glary, and assault are easily understood without domain-
specific expertise, ensuring that participants can focus on the
visualization rather than the semantics of the data.

• T8 – Recover Metric Duration: Accurately determine the true
duration of a distorted interval. This task safeguards against
the “Lie Factor” [39] by ensuring users can retrieve precise
quantitative values despite the visual abstraction.

4.3 Technology stack
The prototype will utilize a web-based architecture to support inter-
active 2D and 3D spatiotemporal visualization, allowing for rapid
prototyping and flexibility.

The webtool will be developed using React, TypeScript, and
Vite. The 3D visualization, including the space-time cube, will be
implemented with Three.js, while D3.js will be used for the 2D view
and its associated temporal controls.

This stack was chosen for its alignment with the modular,
TypeScript-based architecture of the TimeLighting project. This
similarity allows the system to leverage established development
paradigms and data handling workflows for the proposed hybrid
2D/3D design.

The final decision for the backend and data management layer will
be determined at a later stage of the thesis. The likely configuration
will involve a lightweight RESTful or asynchronous API and a
relational database to serve preprocessed datasets to the frontend.

4.4 Proposed Visualization Framework
This project proposes a hybrid visualization environment designed
to support specific analytical needs. The framework is defined first
by the conceptual tasks required to analyze bursty data, and second
by the visual and interaction designs proposed to support them.

4.4.1 Conceptual Tasks
The visualization design is informed by a set of conceptual tasks that
define the analytical reasoning the system must support. These tasks
are adapted from established spatiotemporal taxonomies [1, 18] to
ensure the system facilitates both high-level exploration and detailed
investigation.

• T1 – Obtain an Overview: Perceive broad spatiotemporal
patterns, including global trends, high-activity intervals, and
spatial clusters.

• T2 – Trace Trajectories: Follow the temporal evolution of
individual entities to understand movement paths and duration.

• T3 – Compare Temporal Behaviors: Compare timing, du-
ration, or spatial extent across multiple entities to identify
synchronicity or divergence.

• T4 – Detect Events or Anomalies: Identify specific intersec-
tions, pauses, or abrupt changes in activity that deviate from
the norm.

• T5 – Summarize Patterns and Trends: Generalize from de-
tailed observations to identify recurring behaviors or periodic
patterns.

Additionally, three tasks specifically evaluate the efficacy of the
proposed non-uniform temporal scaling in handling burstiness:

• T6 – Discriminate Intra-Burst Sequence: Distinguish the
temporal order of rapid, concurrent events. This validates
if adaptive scaling reveals micro-temporal sequences often
obscured by clutter in linear representations [41].

4.4.2 Visualization and Interaction Design

To effectively support the defined tasks, the system design can re-
solve the conflict between high-level density patterns and low-level
temporal sequences. Consequently, the environment can be struc-
tured to couple a 2D density projection with a 3D Space-Time Cube
(STC) to address specific perceptional bottlenecks.

Bursty spatiotemporal data suffers inherently from occlusion
and visual clutter. To address this and enable users to Obtain an
Overview (T1), the system can utilize a 2D map projection em-
ploying opacity modulation. Following established clutter reduction
taxonomies [10], this encoding can be selected to reveal high-activity
clusters and Summarize Patterns (T5) without the immediate cog-
nitive overhead of 3D navigation. However, recognizing that 2D
flattening obscures concurrency, the design can incorporate a co-
ordinated 3D STC view to support Tracing Trajectories (T2). By
mapping time geometrically to the vertical axis, the framework can
resolve the ambiguity of overlapping paths that prevents accurate
analysis in static map views.

A critical limitation of traditional STCs is the rigidity of the linear
time axis, which visually compresses short, intense bursts into illeg-
ible clusters. To overcome this limitation and support Comparing
Behaviors (T3) and Detecting Anomalies (T4), the project can inves-
tigate the application of non-uniform temporal scaling. This trans-
formation can be designed to visually expand dense intervals, with
the specific goal of making it possible to Discriminate Intra-Burst
Sequence (T6) and Characterize Burst Morphology (T7)—analytical
tasks that are otherwise impossible in linear representations. To fur-
ther separate signal from noise during these high-density intervals,
visual attributes can be strictly encoded based on channel effective-
ness [25]: hue can be reserved for categorical discrimination, while
transparency can be employed to filter low-confidence events.

Disconnected views often lead to context switching and disori-
entation. To prevent this, the proposed interaction model can adopt
the intent-based taxonomy of Yi et al. [45] to enforce a unified
workflow:

• Explore: To maintain object constancy across dimensions,
navigation can be strictly synchronized; panning or zooming
in the 2D view can drive the 3D camera, preventing the user
from losing spatial context.

• Filter: To manage information overload, the interface can
include a timeline slider to define active temporal windows.
This can allow users to strip away uninteresting intervals and
focus geometry solely on relevant bursts [34].

• Connect (Details-on-Demand): To resolve the depth ambigu-
ity inherent in 3D projections, the system can employ brushing
and linking. This feature can ensure that hovering over a
trajectory in the STC immediately highlights its footprint on
the 2D map, providing necessary quantitative details without
sacrificing the contextual overview.

• T7 – Identify Temporal Dynamics: Classify the internal pac-
ing of a burst to distinguish between gradual escalations and
instantaneous spikes . Capturing these “distributional struc-
tures” is essential for understanding non-linear dynamics [44],
which are often visually compressed into indistinguishable
clusters in uniform temporal encodings.

Collectively, these strategies prioritize interpretability by directly
addressing the challenges of spatial occlusion and temporal compres-
sion. By reducing extraneous cognitive load, the framework aims
to transform the STC into an accessible tool for technically literate
novices, establishing a clear foundation for the empirical evaluation
in the next section.

5 RISK/FEASIBILITY
Whether this project is feasible really comes down to getting the
design, prototyping, and evaluation done on time. The main risk is
that the stages depend on each other, so a delay in one can easily
mess up the whole schedule. To stay on track, the first thing I
need to do is set some clear, minimal requirements right at the start.
After that, I’ll use a time-boxed approach and manage the work
in sprints. Each sprint will aim for a specific goal based on those
requirements. I’ll also figure out a regular schedule for these sprints
and for progress check-ins at the beginning, so I can make quick
changes if needed.

To protect the timeline, I’ll focus on building a Minimum Viable
Product (MVP) first, based only on those core requirements. Any
extra features will be treated as ’stretch goals’ and developed on the
side. This way, I’ll always have a stable, working version ready for
the evaluation.

The user study has its own risks, especially finding enough partic-
ipants and making the tasks clear. I’ll need to tackle these head-on.
Running a lot of internal tests is a must. I’ll use them to tweak the
task instructions, figure out how long sessions should take, and just
make sure everything is easy to understand before the real study
starts.

I also need to be proactive about data and performance. As
discussed in Section 4.2, the Chicago Crime dataset is large (over 7
million records), which could cause performance issues in Three.js
or make navigation difficult. To mitigate this, the prototype will be
developed and tested using a smaller, representative subset of the
data (for example, one year of records). By doing this, we aim to
make the tool interactive and usable for everyone.

Overall, the project is definitely doable, but only if I stay focused
and organized. Using an Agile-style workflow, prioritizing the MVP,
and doing lots of internal testing should give me the framework I
need to manage these risks and get it all done on time.

6 EXPECTED CONTRIBUTIONS AND IMPACT
This project plans to explore alternative visualization techniques for
bursty spatiotemporal data. Although density-aware temporal scal-
ing represents one possible avenue, the scope is deliberately broader.
The primary aim is to identify design principles and mechanisms
that can meaningfully address the interpretive challenges introduced
by bursty, unevenly distributed events.

Rather than centering on a single solution, the project investigates
how adaptations—such as flexible temporal encoding, coordinated
2D views, and extensions to the 3D space–time cube (STC)—might
improve the readability of irregular temporal patterns. The emphasis
is on enhancing interpretability while preserving analytical depth,
enabling clearer representation of bursty dynamics within tempo-
ral–spatial datasets.

The expected contribution lies in demonstrating how such design
strategies can better support users, particularly non-experts, when
analyzing complex event sequences. By offering a more accessible
way to reason about burstiness and outlining directions for future
adaptive temporal models, the project aims to advance the broader
landscape of spatiotemporal visualization.

7 PLANNING AND MILESTONES
The project will follow an iterative six-month timeline running from
January 2026 to June 2026, as illustrated in Appendix A. The sched-
ule is structured into three major phases that reflect the design study
methodology and the exploratory nature of the research.

The initial Preparation and Scoping Phase (January) focuses on
establishing the development environment, selecting and preprocess-
ing the dataset, and validating a minimal proof of concept to ensure
the feasibility of the proposed visualization approach. This phase
should also clarify the core requirements and constraints that will
guide subsequent design decisions.

This is followed by two consecutive Design, Implementation and
Evaluation Cycles, each lasting approximately two months. During
the first cycle (January – March), the emphasis will be on defining
detailed design requirements, implementing an initial hybrid 2D
and 3D visualization prototype and exploring candidate algorithms
for layout and temporal encoding. The insights gained during this
cycle should inform refinements to both the conceptual and technical
design.

The second cycle (April - May) will focus on iterative improve-
ment. This may include refining interaction techniques, optimiz-
ing system performance and adjusting temporal encoding or layout
strategies based on findings from the first cycle. Each cycle con-
cludes with an internal evaluation and reflective analysis to guide
subsequent decisions and ensure alignment with the research objec-
tives.

The final Synthesis and Defense Preparation Phase (June) will
consolidate evaluation results, integrate findings into the written the-
sis and prepare the defense presentation. Writing and documentation
will occur throughout all phases to ensure that design rationales,
methodological reflections and technical insights are captured in real
time and remain aligned with the evolving prototype.

REFERENCES

[1] F. Amini, S. Rufiange, Z. Hossain, Q. Ventura, P. Irani, and M. J.
McGuffin. The impact of interactivity on comprehending 2d and 3d
visualizations of movement data. IEEE Transactions on Visualization
and Computer Graphics, 21(1):122–135, 2015. doi: 10.1109/TVCG.2014.
2329308

[2] G. Andrienko and N. Andrienko. Coordinated multiple views: a critical
view. In Fifth International Conference on Coordinated and Multiple
Views in Exploratory Visualization (CMV 2007), pp. 72–74, 2007. doi:
10.1109/CMV.2007.4

[3] N. Andrienko, G. Andrienko, P. Bak, D. Keim, and S. Wrobel. Visual
analytics of movement. Springer Science & Business Media, 2012.
[4] N. Andrienko, G. Andrienko, and P. Gatalsky. Exploratory spatio-
temporal visualization: an analytical review. Journal of Visual Lan-
guages Computing, 14(6):503–541, 2003. Visual Data Mining. doi:
10.1016/S1045-926X(03)00046-6

[5] D. Archambault, H. C. Purchase, and B. Pinaud. Animation, small
multiples, and the effect of mental map preservation in dynamic graphs.
In IEEE transactions on visualization and computer graphics, vol. 17,
pp. 539–552. IEEE, 2011.

[6] B. Bach, P. Dragicevic, D. Archambault, C. Hurter, and S. Carpendale.
A Review of Temporal Data Visualizations Based on Space-Time Cube
Operations. In Eurographics Conference on Visualization. Swansea,
Wales, United Kingdom, June 2014.

[7] F. Beck, M. Burch, S. Diehl, and D. Weiskopf. A taxonomy and
survey of dynamic graph visualization. Computer Graphics Forum,
36(1):133–159, 2017. doi: 10.1111/cgf.12791

[8] A. Cockburn, A. Karlson, and B. B. Bederson. A review of
overview+detail, zooming, and focus+context interfaces. ACM Com-
puting Surveys (CSUR), 41(1), 2009. doi: 10.1145/1456650.1456652
[9] C. Collberg, S. Kobourov, J. Nagra, J. Pitts, and K. Wampler. A
system for graph-based visualization of the evolution of software. In
Proceedings of the 2003 ACM Symposium on Software Visualization,
SoftVis ’03, p. 77–ff. Association for Computing Machinery, New
York, NY, USA, 2003. doi: 10.1145/774833.774844

[10] G. Ellis and A. Dix. A taxonomy of clutter reduction for informa-
tion visualisation. IEEE Transactions on Visualization and Computer
Graphics, 13(6):1216–1223, 2007. doi: 10.1109/TVCG.2007.70535
[11] N. Ferreira, J. Poco, H. T. Vo, J. Freire, and C. T. Silva. Visual
exploration of big spatio-temporal urban data: A study of new york city
taxi trips. IEEE Transactions on Visualization and Computer Graphics,
19(12):2149–2158, 2013. doi: 10.1109/TVCG.2013.226

[12] V. Filipov, D. Ceneda, D. Archambault, and A. Arleo. Timelighting:
Guided exploration of 2d temporal network projections. IEEE Trans-
actions on Visualization and Computer Graphics, 31(3):1932–1944,
2025. doi: 10.1109/TVCG.2024.3514858

[13] T. H¨agerstrand. What about people in regional science? Papers in

regional science, 24(1):7–24, 1970.

[14] M. Harrower and S. I. Fabrikant. Moving beyond the map: Animated
and interactive cartography. The cartographic journal, 45(1):54–60,
2008.

[15] S. Jung, D. Shin, H. Jeon, and J. Seo. Combinational nonuniform

timeslicing of dynamic networks, 2024.

[16] D. P. K¨aser, M. Agrawala, and M. Pauly. Fingerglass: efficient multi-
scale interaction on multitouch screens. In Proceedings of the SIGCHI
Conference on Human Factors in Computing Systems, CHI ’11, p.
1601–1610. Association for Computing Machinery, New York, NY,
USA, 2011. doi: 10.1145/1978942.1979175

[17] M.-J. Kraak. Space-time cube revisited. In Proceedings of the 21st

Visualization Symposium, pp. 17–24, 2014. doi: 10.1109/PacificVis.2014.
13

[33] M. Sedlmair, M. Meyer, and T. Munzner. Design study methodology:
Reflections from the trenches and the stacks. IEEE Transactions on
Visualization and Computer Graphics, 18(12):2431–2440, 2012. doi:
10.1109/TVCG.2012.213

[34] B. Shneiderman. The eyes have it: a task by data type taxonomy for
information visualizations. In Proceedings 1996 IEEE Symposium on
Visual Languages, pp. 336–343, 1996. doi: 10.1109/VL.1996.545307
[35] P. Simonetto, D. Archambault, and S. Kobourov. Event-based dynamic
graph visualisation. IEEE Transactions on Visualization and Computer
Graphics, 26(7):2373–2386, 2020. doi: 10.1109/TVCG.2018.2886901
[36] J. Sweller. Cognitive load during problem solving: Effects on learning.

International Cartographic Conference (ICC), 2003.

Cognitive science, 12(2):257–285, 1988.

[37] C. Tominski, S. Gladisch, U. Kister, R. Dachselt, and H. Schumann.
Interactive lenses for visualization: An extended survey. Computer
Graphics Forum, 36(6):173–200, 2017. doi: 10.1111/cgf.12871

[38] C. Tominski, H. Schumann, G. Andrienko, and N. Andrienko. Stacking-
based visualization of trajectory attribute data. IEEE Transactions on
Visualization and Computer Graphics, 18(12):2565–2574, 2012. doi:
10.1109/TVCG.2012.265

[39] E. R. Tufte. The visual display of quantitative information. Graphics

Press, USA, 1986.

[40] E. Wall, M. Agnihotri, L. Matzen, K. Divis, M. Haass, A. Endert,
and J. Stasko. A heuristic approach to value-driven evaluation of
IEEE Transactions on Visualization and Computer
visualizations.
Graphics, 25(1):491–500, 2019. doi: 10.1109/TVCG.2018.2865146
[41] Y. Wang, D. Archambault, H. Haleem, T. Moeller, Y. Wu, and H. Qu.
Nonuniform timeslicing of dynamic graphs based on visual complexity,
2019.

[42] Wikipedia Media Commons. Commons:CJK stroke order project.
[43] N. Willems, H. van de Wetering, and J. J. van Wijk. Evaluation of
the visibility of vessel movement features in trajectory visualizations.
Computer Graphics Forum, 30(3):801–810, 2011. doi: 10.1111/j.1467
-8659.2011.01929.x

[44] T. L. Xu, K. de Barbaro, D. H. Abney, and R. F. A. Cox. Finding
structure in time: Visualizing and analyzing behavioral time series.
Frontiers in Psychology, Volume 11 - 2020, 2020. doi: 10.3389/fpsyg.
2020.01457

[45] J. S. Yi, Y. a. Kang, J. Stasko, and J. Jacko. Toward a deeper under-
standing of the role of interaction in information visualization. IEEE
Transactions on Visualization and Computer Graphics, 13(6):1224–
1231, 2007. doi: 10.1109/TVCG.2007.70515

A PROJECT PLANNING OVERVIEW
The following Gantt chart presents the six-month iterative project
timeline from January 2026 to June 2026. It illustrates the cyclical
process consisting of two design–implementation–evaluation cycles,
preceded by a preparation phase and followed by synthesis and de-
fense preparation. Continuous documentation and writing activities
occur throughout all phases.

[18] P. O. Kristensson, N. Dahlback, D. Anundi, M. Bjornstad, H. Gillberg,
J. Haraldsson, I. Martensson, M. Nordvall, and J. Stahl. An evaluation
of space time cube representation of spatiotemporal patterns. IEEE
Transactions on Visualization and Computer Graphics, 15(4):696–702,
2009. doi: 10.1109/TVCG.2008.194

[19] I. Kveladze, M.-J. Kraak, and C. P. V. Elzakker. The space-time cube as
part of a geovisual analytics environment to support the understanding
of movement data. International Journal of Geographical Information
Science, 29(11):2001–2016, 2015. doi: 10.1080/13658816.2015.1058386
[20] I. Kveladze, M.-J. Kraak, and C. P. van Elzakker. A methodological
framework for researching the usability of the space-time cube. The
Cartographic Journal, 50(3):201–210, 2013. doi: 10.1179/1743277413Y.
0000000061

[21] H. Lam, E. Bertini, P. Isenberg, C. Plaisant, and S. Carpendale. Em-
pirical studies in information visualization: Seven scenarios. IEEE
Transactions on Visualization and Computer Graphics, 18(9):1520–
1536, 2012. doi: 10.1109/TVCG.2011.279

[22] A. M. MacEachren. Some truth with maps: A primer on symbolization
and design. Association of American Geographers, Washington, DC,
1994.

[23] R. Mota, N. Ferreira, J. D. Silva, M. Horga, M. Lage, L. Ceferino,
U. Alim, E. Sharlin, and F. Miranda. A comparison of spatiotemporal
visualizations for 3d urban analytics. IEEE Transactions on Visual-
ization and Computer Graphics, p. 1–11, 2022. doi: 10.1109/tvcg.2022.
3209474

[24] T. Munzner. A nested model for visualization design and valida-
tion. IEEE Transactions on Visualization and Computer Graphics,
15(6):921–928, 2009. doi: 10.1109/TVCG.2009.111

[25] T. Munzner. Visualization Analysis and Design. AK Peters Visualiza-

tion Series. CRC Press, 2014.

[26] T. Nakaya and K. Yano. Visualising crime clusters in a space-time cube:
An exploratory data-analysis approach using space-time kernel density
estimation and scan statistics. Transactions in GIS, 14(3):223–239,
2010. doi: 10.1111/j.1467-9671.2010.01194.x

[27] F. Paas, J. E. Tuovinen, H. Tabbers, and P. W. Van Gerven. Cognitive
load measurement as a means to advance cognitive load theory. In
Cognitive load theory, pp. 63–71. Routledge, 2016.

[28] P. Purwanto, S. Utaya, B. Handoyo, S. Bachri, I. S. Astuti, K. S. B.
Utomo, and Y. E. Aldianto. Spatiotemporal analysis of covid-19 spread
with emerging hotspot analysis and space–time cube models in east
ISPRS International Journal of Geo-Information,
java, indonesia.
10(3), 2021. doi: 10.3390/ijgi10030133

[29] A. Rind, T. Wang, W. Aigner, S. Miksch, K. Wongsuphasawat,
C. Plaisant, and B. Shneiderman. Interactive information visualization
to explore and query electronic health records. Foundations and Trends
in Human–Computer Interaction, 5(3):207–298, 2013.

[30] J. C. Roberts. State of the art: Coordinated multiple views in ex-
ploratory visualization. In Fifth International Conference on Coordi-
nated and Multiple Views in Exploratory Visualization (CMV 2007),
pp. 61–71, 2007. doi: 10.1109/CMV.2007.20

[31] G. Robertson, R. Fernandez, D. Fisher, B. Lee, and J. Stasko. Effec-
tiveness of animation in trend visualization. In IEEE transactions on
visualization and computer graphics, vol. 14, pp. 1325–1332. IEEE,
2008.

[32] R. Scheepens, H. v. d. Wetering, and J. J. v. Wijk. Non-overlapping ag-
gregated multivariate glyphs for moving objects. In 2014 IEEE Pacific

i

d
n
a
s
s
e
h
t
n
y
s

l

l

l

a
n
fi
d
n
a
,
s
e
c
y
c
n
o
i
t
a
u
a
v
e
–
n
o
i
t
a
t
n
e
m
e
p
m
–
n
g
s
e
d
o
w

i

i

l

t

,
n
o
i
t
a
r
a
p
e
r
p
g
n
d
u
c
n

i

l

i

,
6
2
0
2
e
n
u
J
o
t
6
2
0
2
y
r
a
u
n
a
J
m
o
r
f
e
n

i
l

e
m

i
t
e
v
i
t
a
r
e
t
i

e
h
t
g
n
i
t
a
r
t
s
u

l
l
i

t
r
a
h
c

t
t
n
a
G

j

t
c
e
o
r
P

:
7
e
r
u
g
F

i

.
n
o
i
t
a
r
a
p
e
r
p

e
s
n
e
f
e
d

