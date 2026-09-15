# Web development 2026

Versioned export of the Obsidian lecture at `Lectures/Web Development 2026/Presentations/Web development 2026.md`. Obsidian remains the live editing source; refresh this export after content changes. The studio loads a snapshot only when explicitly reloaded. Runtime votes and build history are not included.

## Presentation

````json
{
  "version": 1,
  "title": "Web development — past, present, and possible futures",
  "start": "step-1",
  "steps": [
    {
      "id": "step-1",
      "type": "title",
      "chapter": "Opening",
      "title": "Web development: past, present, and possible futures",
      "body": "How do we organize, connect, and use knowledge?\n\nExplore the web’s history and possible futures while we build an application together.\n\nJuho Vepsäläinen · 16.9.26",
      "notes": "00–02 · Two threads: how the web addresses an old knowledge problem, and how we develop for it with agents today. Participation shapes the application. Early visions are a lens for comparison, not a single inevitable lineage.",
      "next": "contents",
      "related": []
    },
    {
      "id": "contents",
      "type": "material",
      "chapter": "Opening",
      "title": "Today’s route",
      "body": "1. **Past** — Finding knowledge; documents, links and native forms\n2. **Present** — Browser interaction; AJAX and shared state\n3. **Future** — What people might delegate to agents\n4. **References** — Sources and further reading",
      "notes": "Introduce the route before the CERN example. Across the sections, we build and inspect one application together.",
      "next": "cern-problem"
    },
    {
      "id": "cern-problem",
      "type": "material",
      "chapter": "Opening",
      "title": "CERN, 1989: finding shared knowledge",
      "body": "![Tim Berners-Lee beside a computer at CERN, photographed in 1994](https://home.cern/wp-content/uploads/2026/05/9407011_31.jpg)\n\n> Often, the information has been recorded, it just cannot be found.\n\nTim Berners-Lee · Information Management: A Proposal",
      "source": "[R5, R24] Berners-Lee · Photo: CERN, 1994",
      "notes": "02–04 · Explain changing projects, people leaving and information spread across incompatible systems. This is the problem behind the proposal, not a desire to invent another interface. The source is dated March 1989 and May 1990.\nSource keys resolve to the References slides at the end. Unquoted explanations are lecture paraphrases; diagrams are not archival reproductions. Photo dates from 1994, not the 1989 proposal. Photo source: https://home.cern/science/computing/the-birth-of-the-web/ ; CERN record 39437. Requires network access.\nFull attribution: [R5, R24] Tim Berners-Lee · Proposal 1989/1990 · Photo: CERN, 1994",
      "next": "knowledge-experience",
      "related": ["cern-connections"],
      "allowRemoteImages": true
    },
    {
      "id": "knowledge-experience",
      "type": "question",
      "chapter": "Opening",
      "title": "Where does this happen in your studies or work?",
      "body": "The information exists—but you cannot find it.\n\nDiscuss with a neighbour for two minutes. Bring back one example.",
      "notes": "04–07 · Hear two examples: course platforms, shared drives, chat histories, project handovers. Keep their wording for the closing discussion. Do not solve the examples yet.",
      "next": "vote-friction"
    },
    {
      "id": "vote-friction",
      "type": "poll",
      "chapter": "Opening",
      "title": "When you use the web today, what feels unnecessarily difficult?",
      "body": "Which difficulty should our application address?",
      "notes": "07–09 · Map the examples just discussed to one predefined choice. Freeze the result; this still feeds the build prompts. Do not repeat the pair discussion.",
      "room": "webdev-2026-friction",
      "poll": {
        "question": "When you use the web today, what feels unnecessarily difficult?",
        "options": [
          {
            "id": "finding",
            "label": "Finding information"
          },
          {
            "id": "repeating",
            "label": "Repeating information"
          },
          {
            "id": "navigation",
            "label": "Navigating interfaces"
          },
          {
            "id": "trust",
            "label": "Knowing what to trust"
          }
        ],
        "defaultId": "finding"
      },
      "next": "step-3"
    },
    {
      "id": "step-3",
      "type": "material",
      "chapter": "Opening",
      "title": "We will build one application—and change how we use it.",
      "body": "You help choose the direction. An agent helps implement it. Together, we inspect what actually works.",
      "notes": "09–11 · Show the starter context. This seminar app is a small test case for finding information and acting on it, not a recreation of an entire historical vision.",
      "next": "step-4",
      "related": ["detour-0-1"]
    },
    {
      "id": "step-4",
      "type": "title",
      "chapter": "Past",
      "title": "Past",
      "body": "Finding and connecting knowledge",
      "notes": "11–14 · Take the theme vote and start Document A, then rewind through four visions while it builds. Spend about 6–8 minutes across the four, not 6–8 minutes each.\nSource keys resolve to the References slides at the end. Unquoted explanations are lecture paraphrases; diagrams are not archival reproductions.",
      "next": "vote-theme",
      "related": ["detour-0-1"],
      "source": "Historical framing · [R1–R5]"
    },
    {
      "id": "vote-theme",
      "type": "poll",
      "chapter": "Past",
      "title": "Which visual theme should shape our app?",
      "body": "Your choice becomes a requirement in the next build.",
      "notes": "Open the prepared room and close voting to freeze the result. Missing decisions require explicitly accepted defaults.",
      "room": "webdev-2026",
      "poll": {
        "question": "Which visual theme should shape our app?",
        "options": [
          {
            "id": "editorial",
            "label": "Editorial"
          },
          {
            "id": "retro-web",
            "label": "Retro web"
          },
          {
            "id": "playful",
            "label": "Playful"
          }
        ],
        "defaultId": "editorial"
      },
      "next": "build-document"
    },
    {
      "id": "build-document",
      "type": "build",
      "chapter": "Past",
      "title": "Build · Create the seminar document",
      "body": "Build Document A: a readable SDLCAI seminar document with our chosen defaults and real links. Show a local preview, finish the relevant checks, and stop before the form.",
      "notes": "Start explicitly, then continue discussing while the agent works. Inspect the app using Preview from Codex when ready.",
      "uses": [
        {
          "poll": "vote-friction",
          "instructions": {
            "finding": "Make seminar essentials easy to scan with headings and a concise summary.",
            "repeating": "Preserve form choices; do not require repeat entry.",
            "navigation": "Use descriptive links and a predictable page structure.",
            "trust": "Attribute seminar facts and distinguish source facts from generated summaries."
          }
        },
        {
          "poll": "vote-theme",
          "instructions": {
            "editorial": "Use an editorial theme with restrained typography.",
            "retro-web": "Use a readable retro-web theme with accessible contrast.",
            "playful": "Use a playful theme with readable typography and accessible controls."
          }
        }
      ],
      "next": "vision-otlet",
      "related": ["detour-0-1"]
    },
    {
      "id": "vision-otlet",
      "type": "material",
      "chapter": "Past",
      "title": "Otlet: organizing knowledge",
      "body": "The Universal Bibliographic Repertory\n\nA shared catalogue of publications, organized for retrieval.",
      "source": "Institutional history · [R1] Mundaneum (n.d.)",
      "notes": "14–16 · One ambition, not a biography: make knowledge discoverable beyond a local collection. Mention classification and the broader ideal of international cooperation. A conceptual precursor, not a claim of direct influence on Berners-Lee.\nSource keys resolve to the References slides at the end. Unquoted explanations are lecture paraphrases; diagrams are not archival reproductions.",
      "next": "vision-bush",
      "related": ["vision-comparison"]
    },
    {
      "id": "vision-bush",
      "type": "material",
      "chapter": "Past",
      "title": "Bush: Memex and associative trails",
      "body": "![Conceptual sketch of the proposed Memex desk with side-by-side displays](https://images.computerhistory.org/revonline/images/500004817-03-01.jpg?w=600)",
      "source": "[R2, R15] Memex sketch, c. 1945 · Computer History Museum",
      "notes": "16–18 · Contrast associative trails with placing each item in a category. The memex was a proposed personal device, not an implemented web. Relate to following references during an assignment.\nSource keys resolve to the References slides at the end. Unquoted explanations are lecture paraphrases; diagrams are not archival reproductions. This is a proposed device, never built. Point to the two displays: how would you preserve the path between two records?\nFull attribution: [R2, R15] Memex conceptual sketch · c. 1945 · Computer History Museum, object 500004817",
      "next": "vision-nelson",
      "related": ["bush-trail", "vision-comparison"],
      "allowRemoteImages": true
    },
    {
      "id": "vision-nelson",
      "type": "material",
      "chapter": "Past",
      "title": "Nelson: hypertext and Xanadu",
      "body": "![Nelson’s diagram showing connections between parallel sequences of text](https://xanadu.com.au/ted/XUsurvey/HARTadj5in.JPG)",
      "source": "[R16] Ted Nelson · 1965 diagram, reproduced 2000",
      "notes": "18–20 · Hypertext term introduced in 1965. Distinguish basic non-sequential reading from Xanadu’s richer ambition: visible connections and reuse tied to origins. Do not imply the web implemented all of Xanadu. Existing vault clippings on Xanadu offer contrasting contemporary opinions, not historical proof.\nSource keys resolve to the References slides at the end. Unquoted explanations are lecture paraphrases; diagrams are not archival reproductions. Distinguish links between items from shared content (transclusion). This is a conceptual diagram, not a screenshot of a working 1965 system.\nFull attribution: [R16] Ted Nelson · 1965 connection diagram reproduced in his 2000 survey, Fig. 1",
      "next": "vision-engelbart",
      "related": ["vision-comparison"],
      "allowRemoteImages": true
    },
    {
      "id": "vision-engelbart",
      "type": "material",
      "chapter": "Past",
      "title": "Engelbart: the 1968 demonstration",
      "body": "![Doug Engelbart speaking beside a shared screen during his 1968 demonstration](https://dougengelbart.org/images/pix/img0029.jpg)",
      "source": "[R4, R25] NLS, 1968 · Doug Engelbart Institute",
      "notes": "20–22 · Emphasize augmentation rather than replacement. His later NLS work gives a concrete bridge to collaborative applications. Ask students to keep this ambition in mind as an agent helps us build. Avoid turning this into a mouse-invention anecdote.\nSource keys resolve to the References slides at the end. Unquoted explanations are lecture paraphrases; diagrams are not archival reproductions. The photo shows the 1968 demonstration, six years after his 1962 conceptual framework. Point to the shared display: people can work with information together. Source: https://dougengelbart.org/content/view/224/217/ , section 4b. Requires network access.\nFull attribution: [R4, R25] NLS demonstration · 9 December 1968 · Doug Engelbart Institute archive",
      "next": "web-response",
      "related": ["vision-comparison"],
      "allowRemoteImages": true
    },
    {
      "id": "web-response",
      "type": "material",
      "chapter": "Past",
      "title": "The web connects information without one central catalogue",
      "body": "Documents can live on different servers.\n\nAddresses identify them. Links connect them.",
      "source": "[R5, R7] Berners-Lee; W3C · Paraphrase",
      "notes": "22–25 · Return to CERN: accommodate existing systems and let people add connections as work changes. This is a practical response, not completion of every earlier vision. Inspect the generated seminar document when ready.\nSource keys resolve to the References slides at the end. Unquoted explanations are lecture paraphrases; diagrams are not archival reproductions.\nFull attribution: Paraphrase · [R5] Tim Berners-Lee (1989/1990); [R7] W3C (2004)",
      "next": "worldwideweb-browser",
      "related": ["cern-connections", "detour-0-1"]
    },
    {
      "id": "worldwideweb-browser",
      "type": "material",
      "chapter": "Past",
      "title": "WorldWideWeb browser-editor",
      "body": "![WorldWideWeb browser-editor on NeXT: document windows and a link-creation menu, screenshot from 1993](https://www.w3.org/History/1994/WWW/Journals/CACM/screensnap2_24c.gif)",
      "allowRemoteImages": true,
      "source": "[R14] Berners-Lee / W3C · Screenshot, 1993",
      "notes": "Use the screenshot instead of explaining the interface in bullets. Point out the Link menu and editing. Ask: what changes when you can create links as well as follow them? This is the 1993 screenshot, not an image of the original 1990 release. Image requires network access.\nFull attribution: [R14] Tim Berners-Lee / W3C · WorldWideWeb (written 1990); screenshot 1993",
      "next": "geocities-personal-page",
      "related": ["detour-0-1"]
    },
    {
      "id": "geocities-personal-page",
      "type": "material",
      "chapter": "Past",
      "title": "GeoCities: personal publishing",
      "body": "![Archived GeoCities page from CollegePark Lounge 9002, displayed in a browser](https://64.media.tumblr.com/547f0c98f0570a6f43406f27e3660b3d/5e00078737a43466-44/s1280x1920/3593b988bc52c5704bb3c421ac8cc2f81579de9e.png)",
      "allowRemoteImages": true,
      "source": "[R17] GeoCities archive · Lialina & Espenschied · Capture 2009",
      "notes": "Use briefly after the browser-editor: personal publishing rather than just institutional information. Ask what students would put on a page of their own. Distinguish control of a page’s design from ownership of its hosting platform. Archive capture date is not the page’s creation date. Screenshot produced by Olia Lialina and Dragan Espenschied’s archive project from rescued files; not necessarily a screenshot taken in 2009.\nFull attribution: [R17] GeoCities CollegePark/Lounge/9002 · archived 28 April 2009 · One Terabyte of Kilobyte Age",
      "next": "step-5"
    },
    {
      "id": "step-5",
      "type": "material",
      "chapter": "Past",
      "title": "HTML: headings, paragraphs and links",
      "body": "```html\n<h1>SDLCAI seminar</h1>\n<p>Explore AI and software development.</p>\n<a href=\"https://www.sdlcai.org/\">Visit the seminar</a>\n```\n\n### SDLCAI seminar\nExplore AI and software development.\n\n[Visit the seminar](https://www.sdlcai.org/)",
      "notes": "25–27 · Ask what each element tells the browser. Below the code is an illustrative rendered equivalent, not an executing HTML sandbox. Inspect the real app afterwards. This is sample copy, not a sourced seminar-program claim.\nFull attribution: [R7, R18] Original teaching example · HTML text and link semantics",
      "next": "step-6",
      "related": ["detour-0-1"],
      "source": "[R7, R18] HTML semantics · Teaching example"
    },
    {
      "id": "step-6",
      "type": "question",
      "chapter": "Past",
      "title": "What will still work if we remove the styling and JavaScript?",
      "body": "Make a prediction before we try it.",
      "notes": "27–30 · Take predictions and inspect the running result. Use the prepared baseline if necessary.",
      "next": "step-7",
      "related": ["detour-0-1"]
    },
    {
      "id": "step-7",
      "type": "material",
      "chapter": "Past",
      "title": "HTML forms",
      "body": "```html\n<form action=\"/vote\" method=\"post\">\n  <label for=\"topic\">Your topic</label>\n  <select id=\"topic\" name=\"topic\">\n    <option value=\"learning\">Learning outcomes</option>\n    <option value=\"practical\">Practical details</option>\n  </select>\n  <button>Vote</button>\n</form>\n```",
      "notes": "30–31 · Ask what the browser sends and where. With Learning outcomes selected: POST /vote, form body topic=learning. The server must provide the route, validate input and return a response; HTML alone does not implement voting. /vote is an illustrative endpoint, not a promise about the generated app. Compare the actual form after Document B completes. Later enhance the same capability with JavaScript.\nFull attribution: [R8] WHATWG HTML — Forms · Original teaching example",
      "next": "build-forms",
      "related": ["detour-1-1"],
      "source": "[R8] WHATWG HTML forms · Teaching example"
    },
    {
      "id": "build-forms",
      "type": "build",
      "chapter": "Past",
      "title": "Build · Add the native voting form",
      "body": "Build Document B using our prepared room backend. Add a labeled native choice form and aggregate response. Verify it without JavaScript. Do not deploy until I request it. Stop before browser enhancement.",
      "notes": "Start explicitly, then continue discussing while the agent works. Inspect the app using Preview from Codex when ready.",
      "uses": [
        {
          "poll": "vote-friction",
          "instructions": {
            "finding": "Make seminar essentials easy to scan with headings and a concise summary.",
            "repeating": "Preserve form choices; do not require repeat entry.",
            "navigation": "Use descriptive links and a predictable page structure.",
            "trust": "Attribute seminar facts and distinguish source facts from generated summaries."
          }
        },
        {
          "poll": "vote-theme",
          "instructions": {
            "editorial": "Use an editorial theme with restrained typography.",
            "retro-web": "Use a readable retro-web theme with accessible contrast.",
            "playful": "Use a playful theme with readable typography and accessible controls."
          }
        }
      ],
      "next": "flow-native",
      "related": ["detour-1-1"]
    },
    {
      "id": "flow-native",
      "type": "material",
      "chapter": "Past",
      "title": "Native form submission · 1/4 Submit",
      "body": "```mermaid\nsequenceDiagram\n%% focus-after: 0,0\n participant B as Browser\n participant S as Server\n participant D as Stored votes\nB->>S: POST /vote · topic=learning\n```",
      "source": "[R8, R19] Teaching model · Adapted from Vepsäläinen",
      "notes": "Model, not a network recording. This example uses POST/Redirect/GET; returning HTML directly is another valid native-form response. Point to topic=learning, then follow the same value through the server. Ask who rendered the results. Browser restoration of local fields can vary; do not claim every reload always clears every input. Compare with the actual generated form.\nReveal 1 of 4: Submit. Advance with Next; Previous revisits the preceding state.\nFull attribution: Explanatory model · [R8, R19] Adapted for this lecture from Juho Vepsäläinen’s Web architecture lens",
      "next": "flow-native-2",
      "related": ["flow-html-4", "flow-json-4"]
    },
    {
      "id": "flow-native-2",
      "type": "material",
      "chapter": "Past",
      "title": "Native form submission · 2/4 Store",
      "body": "```mermaid\nsequenceDiagram\n%% focus-after: 1,0\n participant B as Browser\n participant S as Server\n participant D as Stored votes\nB->>S: POST /vote · topic=learning\nS->>S: Validate input\nS->>D: Record vote\nD-->>S: Vote recorded\n```",
      "source": "[R8, R19] Teaching model · Adapted from Vepsäläinen",
      "notes": "Model, not a network recording. This example uses POST/Redirect/GET; returning HTML directly is another valid native-form response. Point to topic=learning, then follow the same value through the server. Ask who rendered the results. Browser restoration of local fields can vary; do not claim every reload always clears every input. Compare with the actual generated form.\nReveal 2 of 4: Store. Advance with Next; Previous revisits the preceding state.\nFull attribution: Explanatory model · [R8, R19] Adapted for this lecture from Juho Vepsäläinen’s Web architecture lens",
      "next": "flow-native-3",
      "related": ["flow-html-4", "flow-json-4"]
    },
    {
      "id": "flow-native-3",
      "type": "material",
      "chapter": "Past",
      "title": "Native form submission · 3/4 Redirect",
      "body": "```mermaid\nsequenceDiagram\n%% focus-after: 4,0\n participant B as Browser\n participant S as Server\n participant D as Stored votes\nB->>S: POST /vote · topic=learning\nS->>S: Validate input\nS->>D: Record vote\nD-->>S: Vote recorded\nS-->>B: 303 redirect to /results\n```",
      "source": "[R8, R19] Teaching model · Adapted from Vepsäläinen",
      "notes": "Model, not a network recording. This example uses POST/Redirect/GET; returning HTML directly is another valid native-form response. Point to topic=learning, then follow the same value through the server. Ask who rendered the results. Browser restoration of local fields can vary; do not claim every reload always clears every input. Compare with the actual generated form.\nReveal 3 of 4: Redirect. Advance with Next; Previous revisits the preceding state.\nFull attribution: Explanatory model · [R8, R19] Adapted for this lecture from Juho Vepsäläinen’s Web architecture lens",
      "next": "flow-native-4",
      "related": ["flow-html-4", "flow-json-4"]
    },
    {
      "id": "flow-native-4",
      "type": "material",
      "chapter": "Past",
      "title": "Native form submission · 4/4 Load results",
      "body": "```mermaid\nsequenceDiagram\n%% focus-after: 0,1\n participant B as Browser\n participant S as Server\n participant D as Stored votes\n Note over B: Follow the redirect\n B->>S: GET /results\n S->>D: Read aggregate\n D-->>S: Current aggregate\n S-->>B: Complete HTML\n Note over B: Replace the document\n```",
      "source": "[R8, R19] Teaching model · Adapted from Vepsäläinen",
      "notes": "Model, not a network recording. This example uses POST/Redirect/GET; returning HTML directly is another valid native-form response. Point to topic=learning, then follow the same value through the server. Ask who rendered the results. Browser restoration of local fields can vary; do not claim every reload always clears every input. Compare with the actual generated form.\nReveal 4 of 4: Load results. Advance with Next; Previous revisits the preceding state. This slide focuses on the GET after the redirect; submission and storage were shown in the preceding slides.\nFull attribution: Explanatory model · [R8, R19] Adapted for this lecture from Juho Vepsäläinen’s Web architecture lens",
      "next": "step-8",
      "related": ["flow-html-4", "flow-json-4"]
    },
    {
      "id": "step-8",
      "type": "material",
      "chapter": "Past",
      "title": "Progressive enhancement",
      "body": "```mermaid\nflowchart BT\n H[\"HTML + server: submit a vote and read results\"]\n C[\"CSS: make the form easier to scan\"]\n J[\"JavaScript: update results without navigation\"]\n H --> C\n C --> J\n```\n\nRemove JavaScript and CSS: the vote still works.",
      "notes": "31–35 · While the form builds, explain progressive enhancement. Test native submission and keyboard access when ready. Semantic HTML alone is not proof of accessibility.\nSource keys resolve to the References slides at the end. Unquoted explanations are lecture paraphrases; diagrams are not archival reproductions.\nFull attribution: [R9] Original teaching diagram · Progressive enhancement",
      "next": "step-9",
      "related": ["detour-1-1"],
      "source": "[R9] Progressive enhancement · Teaching diagram"
    },
    {
      "id": "step-9",
      "type": "question",
      "chapter": "Past",
      "title": "The capability works. What would make the interaction better?",
      "body": "Suggest one change—and explain who it would help.",
      "notes": "35–38 · Invite one concrete improvement and carry it into the Present prompt.",
      "next": "step-10",
      "related": ["detour-1-1"]
    },
    {
      "id": "step-10",
      "type": "title",
      "chapter": "Present",
      "title": "Present",
      "body": "What happens after your click?",
      "notes": "38–41 · Start the Present build. Show its prompt and explain what is preserved from the native form.\nSource keys resolve to the References slides at the end. Unquoted explanations are lecture paraphrases; diagrams are not archival reproductions.",
      "next": "build-application",
      "related": ["rendering-location", "flow-html-4", "detour-2-1"],
      "source": "Paraphrase · [R10] Jesse James Garrett (2005)"
    },
    {
      "id": "build-application",
      "type": "build",
      "chapter": "Present",
      "title": "Build · Make the room interactive",
      "body": "Advance to Present. Enhance the same form and let the projected view receive aggregate changes. Preserve native submission. Verify in two browser contexts and stop before model composition.",
      "notes": "Start explicitly, then continue discussing while the agent works. Inspect the app using Preview from Codex when ready.",
      "uses": [
        {
          "poll": "vote-friction",
          "instructions": {
            "finding": "Make seminar essentials easy to scan with headings and a concise summary.",
            "repeating": "Preserve form choices; do not require repeat entry.",
            "navigation": "Use descriptive links and a predictable page structure.",
            "trust": "Attribute seminar facts and distinguish source facts from generated summaries."
          }
        },
        {
          "poll": "vote-theme",
          "instructions": {
            "editorial": "Use an editorial theme with restrained typography.",
            "retro-web": "Use a readable retro-web theme with accessible contrast.",
            "playful": "Use a playful theme with readable typography and accessible controls."
          }
        }
      ],
      "next": "flow-html",
      "related": ["flow-html-4", "detour-2-1"]
    },
    {
      "id": "flow-html",
      "type": "material",
      "chapter": "Present",
      "title": "AJAX: HTML response · 1/4 Request",
      "body": "```mermaid\nsequenceDiagram\n%% focus-after: 0,0\n participant B as Browser\n participant S as Server\n participant D as Stored votes\nNote over B: JavaScript handles submit\nB->>S: POST /vote · topic=learning\n```",
      "source": "[R8, R19] Teaching model · Adapted from Vepsäläinen",
      "notes": "The request happens without document navigation. The server still renders the result. AJAX does not require JSON. This is an alternative to compare, not a second required implementation. Preserve a native form path. Show the actual Network response when the build is ready.\nReveal 1 of 4: Request. Advance with Next; Previous revisits the preceding state.\nFull attribution: Explanatory model · [R8, R19] Adapted for this lecture from Juho Vepsäläinen’s Web architecture lens",
      "next": "flow-html-2",
      "related": ["flow-native-4", "rendering-location"]
    },
    {
      "id": "flow-html-2",
      "type": "material",
      "chapter": "Present",
      "title": "AJAX: HTML response · 2/4 Store",
      "body": "```mermaid\nsequenceDiagram\n%% focus-after: 1,1\n participant B as Browser\n participant S as Server\n participant D as Stored votes\nNote over B: JavaScript handles submit\nB->>S: POST /vote · topic=learning\nS->>S: Validate input\nS->>D: Record vote\nD-->>S: Updated aggregate\n```",
      "source": "[R8, R19] Teaching model · Adapted from Vepsäläinen",
      "notes": "The request happens without document navigation. The server still renders the result. AJAX does not require JSON. This is an alternative to compare, not a second required implementation. Preserve a native form path. Show the actual Network response when the build is ready.\nReveal 2 of 4: Store. Advance with Next; Previous revisits the preceding state.\nFull attribution: Explanatory model · [R8, R19] Adapted for this lecture from Juho Vepsäläinen’s Web architecture lens",
      "next": "flow-html-3",
      "related": ["flow-native-4", "rendering-location"]
    },
    {
      "id": "flow-html-3",
      "type": "material",
      "chapter": "Present",
      "title": "AJAX: HTML response · 3/4 Respond",
      "body": "```mermaid\nsequenceDiagram\n%% focus-after: 4,1\n participant B as Browser\n participant S as Server\n participant D as Stored votes\nNote over B: JavaScript handles submit\nB->>S: POST /vote · topic=learning\nS->>S: Validate input\nS->>D: Record vote\nD-->>S: Updated aggregate\nS-->>B: HTML results fragment\n```",
      "source": "[R8, R19] Teaching model · Adapted from Vepsäläinen",
      "notes": "The request happens without document navigation. The server still renders the result. AJAX does not require JSON. This is an alternative to compare, not a second required implementation. Preserve a native form path. Show the actual Network response when the build is ready.\nReveal 3 of 4: Respond. Advance with Next; Previous revisits the preceding state.\nFull attribution: Explanatory model · [R8, R19] Adapted for this lecture from Juho Vepsäläinen’s Web architecture lens",
      "next": "flow-html-4",
      "related": ["flow-native-4", "rendering-location"]
    },
    {
      "id": "flow-html-4",
      "type": "material",
      "chapter": "Present",
      "title": "AJAX: HTML response · 4/4 Update",
      "body": "```mermaid\nsequenceDiagram\n%% focus-after: 5,1\n participant B as Browser\n participant S as Server\n participant D as Stored votes\nNote over B: JavaScript handles submit\nB->>S: POST /vote · topic=learning\nS->>S: Validate input\nS->>D: Record vote\nD-->>S: Updated aggregate\nS-->>B: HTML results fragment\nNote over B: JavaScript swaps the results region\n```",
      "source": "[R8, R19] Teaching model · Adapted from Vepsäläinen",
      "notes": "The request happens without document navigation. The server still renders the result. AJAX does not require JSON. This is an alternative to compare, not a second required implementation. Preserve a native form path. Show the actual Network response when the build is ready.\nReveal 4 of 4: Update. Advance with Next; Previous revisits the preceding state.\nFull attribution: Explanatory model · [R8, R19] Adapted for this lecture from Juho Vepsäläinen’s Web architecture lens",
      "next": "flow-json",
      "related": ["flow-native-4", "rendering-location"]
    },
    {
      "id": "flow-json",
      "type": "material",
      "chapter": "Present",
      "title": "AJAX: JSON response · 1/4 Request",
      "body": "```mermaid\nsequenceDiagram\n%% focus-after: 0,0\n participant B as Browser\n participant S as Server\n participant D as Stored votes\nNote over B: JavaScript handles submit\nB->>S: POST /vote · topic=learning\n```",
      "source": "[R8, R19] Teaching model · Adapted from Vepsäläinen",
      "notes": "The server owns authoritative votes; the browser owns this rendering step. A small fetch handler can do this without SPA routing or a framework. If our demo uses HTML fragments, treat JSON as the comparison instead. These diagrams are teaching models, not promises about exact generated routes.\nReveal 1 of 4: Request. Advance with Next; Previous revisits the preceding state.\nFull attribution: Explanatory model · [R8, R19] Adapted for this lecture from Juho Vepsäläinen’s Web architecture lens",
      "next": "flow-json-2",
      "related": ["flow-native-4", "flow-html-4", "rendering-location"]
    },
    {
      "id": "flow-json-2",
      "type": "material",
      "chapter": "Present",
      "title": "AJAX: JSON response · 2/4 Store",
      "body": "```mermaid\nsequenceDiagram\n%% focus-after: 1,1\n participant B as Browser\n participant S as Server\n participant D as Stored votes\nNote over B: JavaScript handles submit\nB->>S: POST /vote · topic=learning\nS->>S: Validate input\nS->>D: Record vote\nD-->>S: Updated aggregate\n```",
      "source": "[R8, R19] Teaching model · Adapted from Vepsäläinen",
      "notes": "The server owns authoritative votes; the browser owns this rendering step. A small fetch handler can do this without SPA routing or a framework. If our demo uses HTML fragments, treat JSON as the comparison instead. These diagrams are teaching models, not promises about exact generated routes.\nReveal 2 of 4: Store. Advance with Next; Previous revisits the preceding state.\nFull attribution: Explanatory model · [R8, R19] Adapted for this lecture from Juho Vepsäläinen’s Web architecture lens",
      "next": "flow-json-3",
      "related": ["flow-native-4", "flow-html-4", "rendering-location"]
    },
    {
      "id": "flow-json-3",
      "type": "material",
      "chapter": "Present",
      "title": "AJAX: JSON response · 3/4 Respond",
      "body": "```mermaid\nsequenceDiagram\n%% focus-after: 4,1\n participant B as Browser\n participant S as Server\n participant D as Stored votes\nNote over B: JavaScript handles submit\nB->>S: POST /vote · topic=learning\nS->>S: Validate input\nS->>D: Record vote\nD-->>S: Updated aggregate\nS-->>B: JSON aggregate\n```",
      "source": "[R8, R19] Teaching model · Adapted from Vepsäläinen",
      "notes": "The server owns authoritative votes; the browser owns this rendering step. A small fetch handler can do this without SPA routing or a framework. If our demo uses HTML fragments, treat JSON as the comparison instead. These diagrams are teaching models, not promises about exact generated routes.\nReveal 3 of 4: Respond. Advance with Next; Previous revisits the preceding state.\nFull attribution: Explanatory model · [R8, R19] Adapted for this lecture from Juho Vepsäläinen’s Web architecture lens",
      "next": "flow-json-4",
      "related": ["flow-native-4", "flow-html-4", "rendering-location"]
    },
    {
      "id": "flow-json-4",
      "type": "material",
      "chapter": "Present",
      "title": "AJAX: JSON response · 4/4 Update",
      "body": "```mermaid\nsequenceDiagram\n%% focus-after: 5,1\n participant B as Browser\n participant S as Server\n participant D as Stored votes\nNote over B: JavaScript handles submit\nB->>S: POST /vote · topic=learning\nS->>S: Validate input\nS->>D: Record vote\nD-->>S: Updated aggregate\nS-->>B: JSON aggregate\nNote over B: JavaScript renders the results region\n```",
      "source": "[R8, R19] Teaching model · Adapted from Vepsäläinen",
      "notes": "The server owns authoritative votes; the browser owns this rendering step. A small fetch handler can do this without SPA routing or a framework. If our demo uses HTML fragments, treat JSON as the comparison instead. These diagrams are teaching models, not promises about exact generated routes.\nReveal 4 of 4: Update. Advance with Next; Previous revisits the preceding state.\nFull attribution: Explanatory model · [R8, R19] Adapted for this lecture from Juho Vepsäläinen’s Web architecture lens",
      "next": "step-11",
      "related": ["flow-native-4", "flow-html-4", "rendering-location"]
    },
    {
      "id": "step-11",
      "type": "material",
      "chapter": "Present",
      "title": "Vote here. Watch the other screen.",
      "body": "Make a choice. Watch how the shared view responds.",
      "notes": "41–49 · Open two real views. Submit one predefined choice and watch the aggregate. The second view needs its own update mechanism: inspect whether this app polls, uses server-sent events or WebSockets. Do not suggest that updating one browser automatically updates another.",
      "next": "step-12",
      "related": ["flow-shared", "flow-html-4", "detour-2-1"]
    },
    {
      "id": "step-12",
      "type": "question",
      "chapter": "Present",
      "title": "Disconnect the browser. What can it honestly tell us?",
      "body": "Was the vote recorded—or is the outcome unknown?",
      "notes": "49–54 · Use the rehearsal app, not an unrelated production service. Browser DevTools offline mode affects that browser, not the whole server. Distinguish failure before send from a response lost after the server wrote the vote. Do not blindly retry an uncertain write: duplicate handling is an implementation concern. If offline reproduction is unreliable, discuss the failure diagram as a model. Compare native and enhanced feedback.",
      "next": "step-13",
      "related": ["flow-failure", "flow-html-4", "detour-2-1"]
    },
    {
      "id": "step-13",
      "type": "question",
      "chapter": "Present",
      "title": "A person can use this. What would another client need to understand it?",
      "body": "Think about the available actions, required input, and resulting state.",
      "notes": "54–58 · Inspect the form or shared contract. Distinguish explicit actions from behavior that must be inferred.\nSource keys resolve to the References slides at the end. Unquoted explanations are lecture paraphrases; diagrams are not archival reproductions.\nFull attribution: Discussion informed by · [R12] Petros, Gross, Shaffer and Revelle (2025)",
      "next": "step-14",
      "related": ["flow-native-4", "flow-html-4", "flow-json-4", "detour-2-1"],
      "source": "[R12] Petros et al., 2025 · Discussion"
    },
    {
      "id": "step-14",
      "type": "title",
      "chapter": "Future",
      "title": "Future",
      "body": "What should we be able to delegate?",
      "notes": "58–62 · Start constrained Future composition when inputs are ready. Explain that the agent building this app and an agent using it are different roles.\nSource keys resolve to the References slides at the end. Unquoted explanations are lecture paraphrases; diagrams are not archival reproductions.\nFull attribution: Hypothesis · [R13] Approved, unpublished position paper (2026)",
      "next": "future-visions",
      "related": ["detour-3-0", "detour-3-1"],
      "source": "[R13] Lecture hypothesis · Unpublished paper, 2026"
    },
    {
      "id": "future-visions",
      "type": "question",
      "chapter": "Future",
      "title": "Which early ambition is still unfinished?",
      "body": "Find knowledge. Follow connections. Work through a problem.\n\nWhat would you now ask a software agent to do?",
      "source": "Lecture synthesis · [R1–R5]",
      "notes": "58–60 · Briefly recall Otlet, Bush, Nelson and Engelbart; use related images rather than repeat the biographies. Hear one task from the room. Keep the distinction between assistance and replacement.",
      "related": ["vision-bush", "vision-nelson", "vision-engelbart"],
      "next": "semantic-web-agents"
    },
    {
      "id": "semantic-web-agents",
      "type": "material",
      "chapter": "Future",
      "title": "Semantic Web agents (2001)",
      "body": "```mermaid\nflowchart LR\n Need[Arrange appointments] --> Agent[Software agent]\n Providers[Providers and availability] --> Agent\n Constraints[Preferences and schedules] --> Agent\n Agent --> Plan[Proposed plan]\n```",
      "source": "[R21] Berners-Lee, Hendler & Lassila, 2001 · Teaching diagram",
      "notes": "60–62 · The article’s fictional scenario coordinates care appointments, provider constraints and family schedules. It illustrates a proposed future, not a deployed system. Explicit data meanings and inference rules were central. Do not equate this with modern language models or claim the Semantic Web disappeared. The practical question remains: how can services communicate meaning well enough for useful delegation?\nFull attribution: [R21] Berners-Lee, Hendler & Lassila · The Semantic Web (2001) · Paraphrase and original diagram",
      "next": "vote-priority"
    },
    {
      "id": "vote-priority",
      "type": "poll",
      "chapter": "Future",
      "title": "What should the generated seminar view prioritize?",
      "body": "Your choice becomes a requirement in the next build.",
      "notes": "Open the prepared room and close voting to freeze the result. Missing decisions require explicitly accepted defaults.",
      "room": "webdev-2026-priority",
      "poll": {
        "question": "What should the generated seminar view prioritize?",
        "options": [
          {
            "id": "overview",
            "label": "Quick overview"
          },
          {
            "id": "learning",
            "label": "Learning outcomes"
          },
          {
            "id": "practical",
            "label": "Practical details"
          }
        ],
        "defaultId": "overview"
      },
      "next": "build-agents"
    },
    {
      "id": "build-agents",
      "type": "build",
      "chapter": "Future",
      "title": "Build · Compose a constrained interface",
      "body": "Advance to Future under our composition contract. Reuse the reviewed material and locked aggregate revision. Show the context receipt and deterministic fallback. Do not widen model authority or deploy unless requested.",
      "notes": "Start explicitly, then continue discussing while the agent works. Inspect the app using Preview from Codex when ready.\n62–65 · Show the actual resolved build prompt, including the frozen audience priority. Explain that the coding agent builds the application; the runtime composition model has a different, constrained role. No real booking, purchase or personal profile is needed.",
      "uses": [
        {
          "poll": "vote-friction",
          "instructions": {
            "finding": "Make seminar essentials easy to scan with headings and a concise summary.",
            "repeating": "Preserve form choices; do not require repeat entry.",
            "navigation": "Use descriptive links and a predictable page structure.",
            "trust": "Attribute seminar facts and distinguish source facts from generated summaries."
          }
        },
        {
          "poll": "vote-theme",
          "instructions": {
            "editorial": "Use an editorial theme with restrained typography.",
            "retro-web": "Use a readable retro-web theme with accessible contrast.",
            "playful": "Use a playful theme with readable typography and accessible controls."
          }
        },
        {
          "poll": "vote-priority",
          "instructions": {
            "overview": "Prioritize a concise overview using trusted seminar data.",
            "learning": "Prioritize learning outcomes supported by the source.",
            "practical": "Prioritize available dates, location and attendance details; do not invent facts."
          }
        }
      ],
      "next": "meaning-and-action",
      "related": ["detour-3-0", "detour-3-1"]
    },
    {
      "id": "meaning-and-action",
      "type": "material",
      "chapter": "Future",
      "title": "Discovering available actions",
      "body": "| Question | In our seminar app |\n|---|---|\n| What is this? | Seminar information and its source |\n| What can I do? | Choose a priority; request a view |\n| What input is valid? | The predefined choices |\n| What happened? | A result, rejection or unknown outcome |",
      "source": "Lecture synthesis · [R8, R12, R13, R21]",
      "notes": "65–69 · Inspect actual controls and responses. Semantic Web work also considered services and actions; this is not a claim that it only described nouns. The distinction helps explain behavioral affordances. Can the client discover the next action, or must it guess?",
      "next": "accessibility-parallels"
    },
    {
      "id": "accessibility-parallels",
      "type": "material",
      "chapter": "Future",
      "title": "Human accessibility and agent interaction",
      "body": "| Shared design | Human accessibility | Agent use |\n|---|---|---|\n| Named controls | Identify purpose | Identify action |\n| Explicit inputs | Understand choices | Construct valid input |\n| Exposed state | Perceive feedback | Check the outcome |\n| Stable structure | Navigate consistently | Locate relevant controls |",
      "source": "[R22, R23] WAI guidance · [R12, R13] Agent hypothesis",
      "notes": "69–72 · Human accessibility is the goal in its own right, not a proxy for machine convenience. Assistive technology mediates human use; an autonomous agent is not a screen-reader user. Agent benefit depends on whether it reads the DOM, accessibility tree, pixels or a separate contract. Accessible names are not guaranteed agent success; native HTML still requires testing for keyboard, focus, contrast and understandable feedback. Explicit constraints need server validation. Do not give every static message an ARIA live region.\nFull attribution: Human guidance: [R22, R23] · Agent parallels: lecture hypothesis [R12, R13]",
      "next": "step-16",
      "related": ["accessibility-boundaries"]
    },
    {
      "id": "step-16",
      "type": "question",
      "chapter": "Future",
      "title": "Explicit affordances in HTML",
      "body": "Make actions, inputs and outcomes explicit.",
      "notes": "72–77 · The human-facing HTML page or application can also expose enough information for machines to act. People often infer how an interface works from visual conventions and context. Machines, especially when limited to screenshots, may have to guess. Explicit affordances can reduce that guesswork without requiring a separate interface. This is the lecture’s design argument, not a guarantee of agent reliability. Programmatically available information can help assistive technologies and agents, but their requirements are not identical. Inspect the actual controls, inputs and result feedback in our app. Distinguish an agent using this interface from one composing another view. Use the stable-versus-generated question as an optional detour.\nFull attribution: Hypothesis · [R13] Approved, unpublished position paper (2026)",
      "next": "step-17",
      "related": [
        "step-15",
        "accessibility-boundaries",
        "detour-3-0",
        "detour-3-1"
      ],
      "source": "[R13] Lecture hypothesis · Unpublished paper, 2026"
    },
    {
      "id": "step-17",
      "type": "question",
      "chapter": "Future",
      "title": "Inspect the model’s inputs and output",
      "body": "Inspect the context receipt.\n\nWhich input helped? Which conclusion was not justified?",
      "notes": "77–83 · Show actual inputs, source data and destination. Separate frozen aggregate priorities from personal information. Inspect the result against its sources. Return to Bush: a personal knowledge tool need not imply surrendering a personal profile. Do not invent a failure if none occurred; use a clearly labeled hypothetical case.\nFull attribution: Lecture design proposal · Context receipt is not an established standard",
      "next": "step-18",
      "related": ["detour-4-0", "detour-4-1"],
      "source": "Context receipt · Lecture proposal"
    },
    {
      "id": "step-18",
      "type": "material",
      "chapter": "Closing",
      "title": "CERN, 1989",
      "body": "> Often, the information has been recorded, it just cannot be found.",
      "notes": "83–84 · Return to the opening quote and one example the audience gave. Connect finding information with discovering how to use it. Keep this callback brief; the audience applies the argument on the next slide.\nFull attribution: Quotation · [R5] Tim Berners-Lee · Information Management: A Proposal (1989/1990)",
      "next": "closing-app-question",
      "related": ["vision-comparison", "detour-5-0", "detour-5-1"],
      "source": "[R5] Berners-Lee, 1989/1990 · Quotation"
    },
    {
      "id": "closing-app-question",
      "type": "question",
      "chapter": "Closing",
      "title": "What would you change in our app so an agent wouldn’t have to guess?",
      "body": "Discuss with a neighbour for two minutes. Suggest one specific change.",
      "notes": "84–89 · Take two or three suggestions grounded in the app. Possible discussion points: action labels, explicit inputs, validation, result feedback and permissions. Distinguish ambiguity from missing authority: a clear action does not grant permission to perform it. Invite a counterexample; do not turn the answers into a feature backlog or start another build.",
      "next": "step-19",
      "related": ["accessibility-parallels", "meaning-and-action"]
    },
    {
      "id": "step-19",
      "type": "material",
      "chapter": "Closing",
      "title": "Designing for people and machines",
      "body": "When you build for people, make the actions explicit enough for machines too.",
      "notes": "89–90 · State the takeaway and stop. This is the lecturer’s design argument, not a guarantee that every agent can use the interface. Leave this slide visible for discussion. References follow only when wanted; mention free seminar tickets as an optional continuation, not as the conclusion.\nFull attribution: Lecture design argument · [R13] Approved, unpublished position paper (2026)",
      "related": ["detour-5-0", "detour-5-1"],
      "next": "references-title",
      "source": "[R13] Lecture design argument · Unpublished paper, 2026"
    },
    {
      "id": "references-title",
      "type": "title",
      "chapter": "References",
      "title": "References",
      "body": "Sources and further reading",
      "notes": "The main discussion ends on the preceding slide. Continue here when students want the source material.",
      "next": "references-1"
    },
    {
      "id": "references-1",
      "type": "material",
      "chapter": "References",
      "title": "References · Early visions and the web",
      "body": "- [R1] Mundaneum (n.d.). [History](https://mundaneum.org/en/the-mundaneum/history/)\n- [R2] Vannevar Bush (1945). [As We May Think](https://www.theatlantic.com/magazine/archive/1945/07/as-we-may-think/303881/)\n- [R3] Ted Nelson (1999). [Xanalogical Structure: Now More Than Ever](https://www.xanadu.net/NOWMORETHANEVER/XuSum99.html)\n- [R4] Douglas Engelbart (1962). [Augmenting Human Intellect: A Conceptual Framework](https://dougengelbart.org/content/view/138/000/)\n- [R5] Tim Berners-Lee (1989/1990). [Information Management: A Proposal](https://www.w3.org/History/1989/proposal.html)\n- [R6] Tim Berners-Lee and Robert Cailliau (1990). [WorldWideWeb: Proposal for a HyperText Project](https://info.cern.ch/hypertext/WWW/Proposal.html)",
      "notes": "Reference appendix, not timed lecture content. Citation keys are unchanged. R13 is a position paper, not empirical proof; context receipts and teaching diagrams are lecture proposals.",
      "next": "references-2"
    },
    {
      "id": "references-2",
      "type": "material",
      "chapter": "References",
      "title": "References · Architecture and interaction",
      "body": "- [R7] W3C (2004). [Architecture of the World Wide Web, Volume One](https://www.w3.org/TR/webarch/)\n- [R8] WHATWG (living standard). [HTML Living Standard — Forms](https://html.spec.whatwg.org/multipage/forms.html)\n- [R9] Aaron Gustafson (2008). [Understanding Progressive Enhancement](https://alistapart.com/article/understandingprogressiveenhancement/)\n- [R10] Jesse James Garrett (2005). [Ajax: A New Approach to Web Applications](https://www.oceanpark.com/webmuseum/2005/garrett_on_ajax.html)\n- [R11] W3C WAI (living guidance). [WCAG overview](https://www.w3.org/WAI/standards-guidelines/wcag/)\n- [R12] Petros, Gross, Shaffer and Revelle (2025). [The Missing Mechanic: Behavioral Affordances as the Limiting Factor in Generalizing HTML Controls](https://doi.org/10.1145/3720553.3746684)",
      "notes": "Reference appendix, not timed lecture content. Citation keys are unchanged. R13 is a position paper, not empirical proof; context receipts and teaching diagrams are lecture proposals.",
      "next": "references-3"
    },
    {
      "id": "references-3",
      "type": "material",
      "chapter": "References",
      "title": "References · Position and imagery",
      "body": "- [R13] *Hypermedia as a Substrate for the Agentic Web: From Documents to Affordances* (2026). Approved, unpublished position paper; manuscript supplied by the lecturer.\n- [R14] Tim Berners-Lee. [The WorldWideWeb browser](https://www.w3.org/People/Berners-Lee/WorldWideWeb.html). Browser-editor written in 1990; reproduced screenshot from 1993.",
      "notes": "Reference appendix, not timed lecture content. Citation keys are unchanged. R13 is a position paper, not empirical proof; context receipts and teaching diagrams are lecture proposals.",
      "next": "references-4"
    },
    {
      "id": "references-4",
      "type": "material",
      "chapter": "References",
      "title": "References · Images and code",
      "body": "- [R15] Computer History Museum. [Memex conceptual sketch](https://www.computerhistory.org/revolution/the-web/20/370/2111), c. 1945; object 500004817.\n- [R16] Ted Nelson. [Xanalogical Structure](https://xanadu.com.au/ted/XUsurvey/xuDation.html), 2000 version, Fig. 1 (1965 diagram).\n- [R17] Olia Lialina and Dragan Espenschied. [GeoCities: CollegePark/Lounge/9002](https://oneterabyteofkilobyteage.tumblr.com/post/827274459639611392/original-url). Archive capture: 28 April 2009.\n- [R18] WHATWG. [HTML text-level semantics](https://html.spec.whatwg.org/multipage/text-level-semantics.html), living standard.",
      "notes": "Image credits identify the holding collection or source publication, not a claim that images are public domain. Code examples are original teaching material grounded in the HTML standard.",
      "next": "references-flows"
    },
    {
      "id": "references-flows",
      "type": "material",
      "chapter": "References",
      "title": "References · Architecture demos",
      "body": "- [R19] Juho Vepsäläinen. [Web architecture lens](https://scalableweb.dev/demos/#demo-web-architecture-lens). Teaching model: initial delivery and later interaction are separate decisions.\n- [R20] Juho Vepsäläinen. [Client activation lens](https://scalableweb.dev/demos/#demo-client-activation-lens). Teaching comparison of hydration, islands and resumability.\n\nLecture flow diagrams are adaptations, not captured network traces.",
      "notes": "Do not present modeled request sizes or timings as measurements. HTML behavior remains grounded in [R8].",
      "next": "references-semantic-access"
    },
    {
      "id": "references-semantic-access",
      "type": "material",
      "chapter": "References",
      "title": "References · Meaning and accessibility",
      "body": "- [R21] Tim Berners-Lee, James Hendler and Ora Lassila (2001). [The Semantic Web](https://lassila.org/publications/2001/SciAm.html). Scientific American 284(5), 34–43.\n- [R22] W3C WAI. [Labeling Controls](https://www.w3.org/WAI/tutorials/forms/labels/). Human accessibility guidance.\n- [R23] W3C WAI. [User Notification](https://www.w3.org/WAI/tutorials/forms/notifications/). Human accessibility guidance.",
      "notes": "Agent parallels are lecture hypotheses, not results established by WAI guidance. Historical appointment scenario is fictional.",
      "next": "references-history-photos"
    },
    {
      "id": "references-history-photos",
      "type": "material",
      "chapter": "References",
      "title": "References · Historical photographs",
      "body": "- [R24] CERN. [The birth of the Web](https://home.cern/science/computing/the-birth-of-the-web/). Tim Berners-Lee photograph, 1994; CERN PhotoLab, record 39437.\n- [R25] Doug Engelbart Institute. [History in Pictures, §4b](https://dougengelbart.org/content/view/224/217/). Frame from the NLS demonstration, 9 December 1968.",
      "notes": "Image credits identify source collections; no public-domain claim. The CERN image is later than the 1989 proposal."
    },
    {
      "id": "step-15",
      "type": "question",
      "title": "Which applications need a stable interface, and which could use a generated one?",
      "body": "Choose one example of each. What makes the difference?",
      "notes": "62–70 · Give pairs two minutes, then discuss examples while the build runs. Use the two-directions diagram. This is a position, not a proven forecast.\nSource keys resolve to the References slides at the end. Unquoted explanations are lecture paraphrases; diagrams are not archival reproductions.\nFull attribution: Hypothesis · [R13] Approved, unpublished position paper (2026)",
      "related": ["detour-3-0", "detour-3-1"],
      "source": "[R13] Lecture hypothesis · Unpublished paper, 2026"
    },
    {
      "id": "detour-0-1",
      "type": "material",
      "title": "Web foundations · diagram",
      "body": "```mermaid\nflowchart LR\n Document -->|link| Resource\n Resource -->|link| Another[Another resource]\n```",
      "notes": "What survives when CSS and JavaScript are removed?\nSource keys resolve to the References slides at the end. Unquoted explanations are lecture paraphrases; diagrams are not archival reproductions.\nFull attribution: Original explanatory diagram · [R6] Tim Berners-Lee and Robert Cailliau (1990)",
      "source": "[R6] Berners-Lee & Cailliau, 1990 · Teaching diagram"
    },
    {
      "id": "detour-1-1",
      "type": "material",
      "title": "Progressive enhancement · diagram",
      "body": "```mermaid\nflowchart BT\n HTML[Working HTML capability] --> CSS[CSS presentation]\n CSS --> JS[JavaScript interaction]\n```",
      "notes": "Turn off JavaScript: can a person still submit the form? Semantic HTML is a foundation, not proof of accessibility.\nSource keys resolve to the References slides at the end. Unquoted explanations are lecture paraphrases; diagrams are not archival reproductions.\nFull attribution: Original explanatory diagram · [R9] Aaron Gustafson (2008)",
      "source": "[R9] Gustafson, 2008 · Teaching diagram"
    },
    {
      "id": "detour-2-1",
      "type": "material",
      "title": "Browser applications · diagram",
      "body": "```mermaid\nsequenceDiagram\n Browser->>Server: Request data\n Server-->>Browser: Data or fragment\n Note over Browser: Update current view\n```",
      "notes": "Which interaction is worth the extra state management? Give frameworks credit for the problems they solve.\nSource keys resolve to the References slides at the end. Unquoted explanations are lecture paraphrases; diagrams are not archival reproductions.\nFull attribution: Original explanatory diagram · [R10] Jesse James Garrett (2005)",
      "source": "[R10] Garrett, 2005 · Teaching diagram"
    },
    {
      "id": "detour-3-0",
      "type": "material",
      "title": "Agentic directions · definition",
      "body": "Existing applications may expose clearer actions to agents. Some services may instead let consumer agents construct an interface for the task.",
      "notes": "Which application needs a stable interface? These directions can coexist; neither is an established outcome.\nSource keys resolve to the References slides at the end. Unquoted explanations are lecture paraphrases; diagrams are not archival reproductions.\nFull attribution: Hypothesis · [R13] Approved, unpublished position paper (2026)",
      "source": "[R13] Lecture hypothesis · Unpublished paper, 2026"
    },
    {
      "id": "detour-3-1",
      "type": "material",
      "title": "Agentic directions · diagram",
      "body": "```mermaid\nflowchart LR\n C[Shared capability] --> P[Provider-designed interface]\n C --> A[Agent-composed interface]\n P --> H[Human use]\n A --> H\n```",
      "notes": "Which application needs a stable interface? These directions can coexist; neither is an established outcome.\nSource keys resolve to the References slides at the end. Unquoted explanations are lecture paraphrases; diagrams are not archival reproductions.\nFull attribution: Original diagram of a hypothesis · [R13] Approved, unpublished position paper (2026)",
      "source": "[R13] Lecture hypothesis · Unpublished paper, 2026"
    },
    {
      "id": "detour-4-0",
      "type": "material",
      "title": "Context boundaries · definition",
      "body": "A visible account of the information used to produce a result, where it was sent, and what action followed.",
      "notes": "What useful personal information would you refuse to send? This receipt is a proposed design pattern, not a standard.\nSource keys resolve to the References slides at the end. Unquoted explanations are lecture paraphrases; diagrams are not archival reproductions.\nFull attribution: Lecture design proposal · Context receipt is not an established standard",
      "source": "Context receipt · Lecture proposal"
    },
    {
      "id": "detour-4-1",
      "type": "material",
      "title": "Context boundaries · diagram",
      "body": "```mermaid\nflowchart LR\n R[Aggregate room choices] --> B[Declared context boundary]\n N[Curated lecture notes] --> B\n B --> A[Agent selection]\n A --> V[Rendered view]\n```",
      "notes": "What useful personal information would you refuse to send? This receipt is a proposed design pattern, not a standard.\nSource keys resolve to the References slides at the end. Unquoted explanations are lecture paraphrases; diagrams are not archival reproductions.\nFull attribution: Original diagram · Lecture context-receipt proposal",
      "source": "Context receipt · Teaching diagram"
    },
    {
      "id": "detour-5-0",
      "type": "material",
      "title": "Shared capability · definition",
      "body": "One shared description of a capability and its constraints may support human interfaces, assistive tools, and agents.",
      "notes": "Ask for a counterexample. Shared semantics do not guarantee accessibility or better agent performance.\nSource keys resolve to the References slides at the end. Unquoted explanations are lecture paraphrases; diagrams are not archival reproductions.\nFull attribution: Hypothesis · [R13] Approved, unpublished position paper (2026)",
      "source": "[R13] Lecture hypothesis · Unpublished paper, 2026"
    },
    {
      "id": "detour-5-1",
      "type": "material",
      "title": "Shared capability · diagram",
      "body": "```mermaid\nflowchart TB\n C[Shared capability and constraints] --> H[Human interface]\n C --> T[Assistive tools]\n C --> A[Agent interaction]\n```",
      "notes": "Ask for a counterexample. Shared semantics do not guarantee accessibility or better agent performance.\nSource keys resolve to the References slides at the end. Unquoted explanations are lecture paraphrases; diagrams are not archival reproductions.\nFull attribution: Original diagram of a hypothesis · [R13] Approved, unpublished position paper (2026)",
      "source": "[R13] Lecture hypothesis · Unpublished paper, 2026"
    },
    {
      "id": "cern-connections",
      "type": "material",
      "title": "CERN: relationships do not fit one filing tree",
      "body": "![Original circles-and-arrows diagram from Berners-Lee’s Information Management proposal](https://www.w3.org/History/1989/Image1.gif)",
      "source": "[R5] © Tim Berners-Lee, 1989/1990 · W3C archive",
      "notes": "Historical artifact, not a teaching reconstruction. Trace one connection rather than reading every label. Notice the mixture of systems, concepts and relationships. Requires network access.\nFull attribution: [R5] Tim Berners-Lee © 1989/1990 · Original proposal diagram, W3C archive",
      "allowRemoteImages": true
    },
    {
      "id": "bush-trail",
      "type": "material",
      "title": "A research trail is more than a folder",
      "body": "```mermaid\nflowchart LR\n Question --> Article\n Article -->|reference| Earlier[Earlier study]\n Earlier -->|association| Example[Example from another field]\n```",
      "source": "[R2] Bush, 1945 · Teaching diagram",
      "notes": "This is a modern explanatory example, not Bush’s original illustration. Ask whether bookmarks retain the reason each source mattered.\nSource keys resolve to the References slides at the end. Unquoted explanations are lecture paraphrases; diagrams are not archival reproductions.\nFull attribution: Original explanatory diagram · [R2] Vannevar Bush (1945)"
    },
    {
      "id": "vision-comparison",
      "type": "question",
      "title": "Which ambition does your everyday software serve?",
      "body": "Otlet: organize knowledge.\n\nBush: preserve trails.\n\nNelson: connect texts and sources.\n\nEngelbart: augment problem-solving.",
      "notes": "Optional detour; these are distinct ambitions, not a chain of direct influence. Ask for one familiar application and one gap. Return to the selected slide afterwards.\nSource keys resolve to the References slides at the end. Unquoted explanations are lecture paraphrases; diagrams are not archival reproductions.",
      "source": "Lecture synthesis and discussion · [R1–R5]"
    },
    {
      "id": "flow-shared",
      "type": "material",
      "title": "Updating a second browser",
      "body": "```mermaid\nsequenceDiagram\n participant A as Browser A\n participant S as Server\n participant D as Stored votes\n participant B as Browser B\n A->>S: Submit vote\n S->>D: Record vote\n S-->>A: Updated result\n B->>S: Request current aggregate\n S->>D: Read votes\n S-->>B: Current aggregate\n Note over B: Render updated result\n```",
      "source": "[R8, R19] Teaching model · Adapted from Vepsäläinen",
      "notes": "Polling example only. Server-sent events or WebSockets can deliver updates differently. Match the explanation to the implementation; no need to teach all three transports. Stored state stays on the server, not in either browser’s display.\nFull attribution: Explanatory model · [R8, R19] Adapted for this lecture from Juho Vepsäläinen’s Web architecture lens"
    },
    {
      "id": "flow-failure",
      "type": "material",
      "title": "Lost response after a recorded vote",
      "body": "```mermaid\nsequenceDiagram\n participant B as Browser\n participant S as Server\n participant D as Stored votes\n B->>S: POST /vote\n S->>D: Record vote\n S--xB: Response lost\n Note over B: Outcome unknown\n Note over S,D: Vote may already be stored\n```",
      "source": "Lost-response scenario · Teaching model",
      "notes": "Ask students what the UI should say. Separate pending, confirmed and unknown. Inspect how the actual demo handles repeated submissions; do not claim exactly-once delivery.\nFull attribution: Original failure scenario · Explanatory model, not an observed demo outcome"
    },
    {
      "id": "rendering-location",
      "type": "material",
      "title": "Initial rendering: server or browser",
      "body": "```mermaid\nflowchart LR\n subgraph SSR[SSR]\n S[Server renders HTML] --> B[Browser displays HTML]\n end\n subgraph CSR[CSR]\n J[Shell and JavaScript] --> C[Browser fetches data and renders]\n end\n```",
      "source": "[R19] Lecture adaptation · Web architecture lens",
      "notes": "Optional Present detour. This is about initial rendering, not how every later interaction works. SSR can initialize an SPA; an HTML-first page can use AJAX. Show the original interactive lens if students want to explore combinations.",
      "related": ["rendering-cached", "activation-detour"]
    },
    {
      "id": "rendering-cached",
      "type": "material",
      "title": "Cached HTML and regeneration",
      "body": "```mermaid\nflowchart LR\n R[Request] --> C[Cached HTML]\n C --> B[Browser]\n C -. Policy triggers regeneration .-> S[Server renders newer HTML]\n S --> C\n```",
      "source": "[R19] Lecture adaptation · Web architecture lens",
      "notes": "ISR is a framework/platform regeneration strategy, not a universal HTTP mode. Some policies serve stale content while regenerating; others differ. The public seminar description can tolerate different freshness from a vote confirmation. Do not imply a vote POST can be safely cached as a read.",
      "related": ["rendering-location"]
    },
    {
      "id": "activation-detour",
      "type": "material",
      "title": "Visible HTML is not the same as initialized JavaScript",
      "body": "[Explore the client activation lens](https://scalableweb.dev/demos/#demo-client-activation-lens)\n\nWhich parts of this page need JavaScript before we can use them?",
      "source": "[R20] Vepsäläinen · Client activation teaching model",
      "notes": "Optional deeper demo. Compare hydration, islands and resumability only if useful to this audience. Native links and forms can work before framework handlers initialize. The course demo’s transfer sizes are illustrative, not measured benchmarks for our app.\nFull attribution: [R20] Juho Vepsäläinen · Client activation lens · Teaching model"
    },
    {
      "id": "accessibility-boundaries",
      "type": "question",
      "title": "Accessible to people does not mean authorized for agents",
      "body": "A clear action can still require permission.\n\nA machine-readable interface can still exclude people.",
      "source": "Lecture distinction · [R11–R13, R22, R23]",
      "notes": "Optional detour. Human accessibility covers perception, operation and understanding, including needs an agent does not share. Agent access adds authorization, scope and verification concerns that accessibility alone does not solve. Compare a well-labeled destructive button with whether an agent should invoke it."
    }
  ]
}
````
