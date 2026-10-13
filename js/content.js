/* DOITSILLY site copy. Source: "DOITSILLY Website — Content Doc" (Oct 12, 2026).
   Edit copy here; the map and panels read from this file.
   Anything in [SQUARE BRACKETS] is unknown and must be filled before launch. */
window.DIS_CONTENT = {
  loader: ["Untangling ideas...", "Sharpening crayons...", "Cutting pizza into eighths...", "Drawing the map..."],
  cookie: "We use cookies so the map remembers where you left off.",
  signoff: "Until you DO IT SILLY.",

  system: {
    doitsilly: { name: "DOITSILLY", line: "Click it to pick a side." }
  },

  /* The chooser that opens when the planet is clicked. Drag Scribble (the pink O in the logo) onto a side. */
  pick: {
    headline: "Pick a side.",
    sub: "Drop Scribble on one.",
    grab: "Drag me!",
    nudge: "Drag Scribble onto it",
    back: "Back to space",
    studio: { name: "DOITSILLY", line: "The studio. Brands, built silly." },
    community: { name: "Community", line: "Creatives, gathered." }
  },

  /* Island names on the map. */
  gate: {
    studio: { label: "DOITSILLY Island", line: "Brands, built silly." },
    about: { label: "About Us Island", line: "Who we are, in four stops." }
  },

  hints: {
    system: "Drag Scribble anywhere. Drop it on a side to go in. Click empty space to make a wish.",
    islands: "Click the island to zoom in. Drag to look around.",
    studio: "Click a pin to go in. Click the locals to say hi.",
    about: "Four stops. Start at The Pizza Party."
  },

  tour: [
    { id: null, text: "Welcome to DOITSILLY Island. Four kinds of team, one very silly town." },
    { id: "design", text: "Scribble Square: this is where brands get their face." },
    { id: "strategy", text: "Paper Plane Point: this is where ideas get aimed before they fly." },
    { id: "content", text: "Post-it Park: this is where brands start talking." },
    { id: "production", text: "Clapper Studios: lights, camera, pizza." },
    { id: "tech", text: "The Robot Shed: robots that do the boring bits." },
    { id: "work", text: "The Fridge Door: only the best drawings get stuck up here." },
    { id: "contact", text: "The Big Red Mailbox. Ready? Drop us a letter. (Want the backstory? Take the ferry to About Us Island.)" }
  ],

  places: {
    design: {
      type: "service", landmark: "Scribble Square", plain: "Design", oneliner: "Look like you. Not like everyone else.",
      hero: "Look like you. Not like everyone else.",
      intro: "Generic logos make brands invisible before they even launch. We build identities with a point of view, then turn them into systems your team can actually use.",
      deliverables: [
        ["Visual identity and logos", "A face people remember after one scroll."],
        ["Brand guidelines and systems", "So the fifth poster looks as good as the first."],
        ["Pitch and brand decks", "Decks that sound like you and look like you mean it."],
        ["Packaging", "Shelf presence, with a personality."],
        ["Campaign key visuals", "One image that carries the whole idea."],
        ["Illustration and characters", "Mascots and worlds people actually like."],
        ["UI/UX", "Screens that feel like the brand, not a template."]
      ],
      steps: [["Dig", "what makes you, you."], ["Draw", "lots of weird options, on purpose."], ["Decide", "keep the weird that works, kill the rest."], ["Deliver", "files, system and a guide your team can run with."]],
      showUp: "As an agency (end to end) or as consultants (plugged into your in-house team).",
      madeWith: "Illustrators, type nerds and motion designers from the community join projects that need a different hand.",
      faq: [
        ["How long does an identity take?", "Usually [X–Y] weeks from first chat to final files. Depends on how messy the idea is. Messy is fine."],
        ["Do you only do full rebrands?", "No. We also refresh, extend or fix one thing that's bugging you."],
        ["Will we own everything?", "Yes. All final files and rights are yours."]
      ],
      next: "strategy"
    },
    strategy: {
      type: "service", landmark: "Paper Plane Point", plain: "Strategy", oneliner: "Find the thing only you can say.",
      hero: "Find the thing only you can say.",
      intro: "We're not here to hand you a mood board and call it strategy. We dig until we find what makes you different, then write it down sharp enough to brief anyone, from your designer to your investor.",
      deliverables: [
        ["Brand positioning", "Where you stand, and who you're standing against."],
        ["Brand story and voice", "How you sound when you're at your best."],
        ["Audience insight", "Who you're actually talking to, and what they care about."],
        ["Go-to-market plans", "How you show up on day one, and day ninety."],
        ["Social strategy", "What to post, where, and why anyone would care."],
        ["Founder branding", "Your face, your voice, your story, sorted."],
        ["Pitch strategy", "The story that gets the room nodding."]
      ],
      steps: [["Listen", "workshops, interviews, a lot of questions."], ["Untangle", "find the one thread that matters."], ["Write it down", "a strategy short enough to remember."], ["Test it", "on real people, before you spend on it."]],
      showUp: "As consultants alongside your team, or as the first step of an agency project.",
      madeWith: "When we need to hear from Gen Z, we ask the room behind the studio wall.",
      faq: [
        ["We already have a strategy deck. Can you help?", "Yes. Often the job is cutting it down to what actually matters."],
        ["Is strategy only for big brands?", "No. Startups need it most, before the money goes into making things."]
      ],
      next: "content"
    },
    content: {
      type: "service", landmark: "Post-it Park", plain: "Content", oneliner: "Stop posting. Start being followed.",
      hero: "Stop posting. Start being followed.",
      intro: "Recurring social IP and content people actually wait for. Made by our in-house team, with a community of creators right behind the studio wall.",
      deliverables: [
        ["Social IP and recurring formats", "Shows, series and bits your audience comes back for."],
        ["Always-on content", "The weekly stuff, done properly."],
        ["Copywriting", "Words that sound like a person wrote them."],
        ["Creator and community content", "Real people, real voices, from the DOITSILLY Community and beyond."],
        ["Social automation", "The repetitive bits, handled by systems."],
        ["PR", "Stories worth telling, told to the right people."]
      ],
      steps: [["Find the format", "one idea that can run for months."], ["Make the first five", "test what lands."], ["Keep it running", "a rhythm, a calendar, a team."]],
      showUp: "As an agency running your channels, or as consultants running social IP with your team.",
      madeWith: "Creators, writers and illustrators from the community make content that doesn't look like an agency made it.",
      faq: [
        ["Do you manage our accounts?", "Yes, on a monthly retainer, or we set it up and hand it over."],
        ["Which platforms?", "Wherever your people are. Usually Instagram, LinkedIn and YouTube."]
      ],
      next: "production"
    },
    production: {
      type: "service", landmark: "Clapper Studios", plain: "Production", oneliner: "Script to screen. All of it.",
      hero: "Script to screen. All of it.",
      intro: "We own the whole pipeline, so the idea that was pitched is the idea that ships. No handoffs, no lost-in-translation.",
      deliverables: [
        ["TVCs", "The big ones."],
        ["DVCs", "Built for feeds, not for TV."],
        ["Brand films", "Your story, told properly."],
        ["Product shoots", "Products that look as good as they are."],
        ["Event films and cutdowns", "One day, many videos."],
        ["Recurring social video", "Formats that keep running."]
      ],
      steps: [["Script", "the idea, the words, the boards."], ["Shoot", "crew, cast, kit, location."], ["Post", "edit, sound, colour, motion."], ["Cut for every screen", "16:9, 9:16, 1:1 and whatever comes next."]],
      showUp: "As a production house, start to finish.",
      madeWith: "Young directors, editors and motion designers from the community join shoots and post.",
      faq: [
        ["Can you shoot outside Bangalore?", "Yes. [CITIES / \"Anywhere in India\"]."],
        ["Can you work with our agency's script?", "Yes. We're happy being just the production house."]
      ],
      next: "tech"
    },
    tech: {
      type: "service", landmark: "The Robot Shed", plain: "Tech", oneliner: "Built, automated, handed over.",
      hero: "Built, automated, handed over.",
      intro: "AI video, full workflows and automation structures, set up for your team, documented, and handed over. Not held hostage.",
      deliverables: [
        ["AI video", "More video, less shoot day."],
        ["Workflow automation", "The boring steps, done by themselves."],
        ["Social automation", "Posting, reporting and repurposing on autopilot."],
        ["Websites and landing pages", "Fast, on-brand and easy to update."],
        ["Internal creative tools", "Small tools that save your team hours."]
      ],
      steps: [["Map the mess", "what's slow, manual and annoying."], ["Build the machine", "tools and workflows that fix it."], ["Hand over the keys", "documentation, training, done."]],
      showUp: "As techies. Built and handed over.",
      madeWith: "Developers from the community build open tools we share in the Free Library.",
      faq: [
        ["Do we need to keep paying you after?", "No. You own it. Support is optional."],
        ["Which tools do you use?", "Whatever fits your team. We'll recommend, not lock you in."]
      ],
      next: "work"
    },
    work: {
      type: "work", landmark: "The Fridge Door", plain: "Work", oneliner: "Proof, with the silly left in.",
      hero: "Proof, with the silly left in.",
      intro: "Brands we've pushed off the cliff, and how they landed.",
      services: ["All", "Design", "Strategy", "Content", "Production", "Tech"],
      cases: [
        { service: "Design", sector: "[SECTOR]", client: "[CLIENT]", outcome: "[One-line outcome]" },
        { service: "Production", sector: "B2B", client: "[CLIENT]", outcome: "A brand film that made a B2B company look human" },
        { service: "Content", sector: "[SECTOR]", client: "[CLIENT]", outcome: "[One-line outcome]" },
        { service: "Strategy", sector: "[SECTOR]", client: "[CLIENT]", outcome: "[One-line outcome]" },
        { service: "Tech", sector: "[SECTOR]", client: "[CLIENT]", outcome: "[One-line outcome]" },
        { service: "Design", sector: "[SECTOR]", client: "[CLIENT]", outcome: "[One-line outcome]" }
      ],
      empty: "Nothing here yet. Which probably means we should make one. Want to be first?",
      cta: ["Your brand could be next on the fridge.", "Pop it in the post. We reply within 2 working days."],
      next: "contact"
    },

    /* ---- About Us Island: the About page, split into four stops ---- */
    story: {
      type: "story", landmark: "The Pizza Party", plain: "Our story", oneliner: "Fractions are just pizza.",
      hero: "Fractions are just pizza.",
      intro: "The whole idea behind DOITSILLY, in one slice.",
      story: [
        ["Our story", [
          "Remember when math felt impossible? Fractions, calculus, all those numbers and letters, mocking you from the textbook.",
          "Then someone said: \u201cFractions is basically just pizza.\u201d Three slices out of eight. Suddenly, math made sense.",
          "Silliness didn't make the math easier. It just made your brain stop panicking.",
          "Now imagine feeling that way about your brand. Your strategy. Your creative work. That same panic. That same blank stare. Why aren't people staying? Are we too generic? Who are we talking to? What's our voice?",
          "Until you DO IT SILLY.",
          "Add silliness to complexity, and something clicks. Design becomes delightful. Strategy becomes shareable. The brain relaxes. The hands start moving. The ideas start flowing."]],
        ["The brief that breaks you", [
          "A founder stares at his half-built brand deck. The cursor blinks. He knows what he wants to say, he just can't make it look or sound like him. His logo is generic. His copy sounds like everyone else. His pitch falls flat because nothing about it feels real.",
          "This is the paralysis of playing it safe. And it's making brands invisible before they even launch."]],
        ["Plot twist: safe doesn't sell", [
          "Memorable brands don't come from templates. They come from creative teams willing to try weird things, and smart enough to know when weird works. The secret to a brand that stops the scroll? Stop trying to look like everyone else."]],
        ["Enter DOITSILLY", [
          "We're not here to hand you a mood board and call it strategy. We're here to push your brand off the cliff, with a parachute made of Post-its and actual creative rigour.",
          "DOITSILLY Studio is where messy ideas become market-ready brands. We work with startups, founders, and young companies done with boring agencies, and done waiting to look like themselves."]]
      ],
      next: "modes"
    },
    modes: {
      type: "modes", landmark: "The Four Hats", plain: "How we work", oneliner: "Four ways to work with us. One team.",
      hero: "We act like four things. We are not one.",
      intro: "Pick the hat that fits the job. Swap it halfway if you need to.",
      modes: [
        ["An agency", "Strategy, design, IP and output, delivered end to end."],
        ["Consultants", "We plug into your in-house team and run what you need: social IP, content, go-to-market strategy, design, UI/UX."],
        ["Techies", "AI video, full workflows, automation structures. Built and handed over."],
        ["A production house", "Script to screen. DVCs, TVCs, recurring social IP. We own the whole pipeline."]
      ],
      modesClose: "We are not an everything agency.",
      next: "who"
    },
    who: {
      type: "who", landmark: "The Welcome Mat", plain: "Who we work with", oneliner: "For brands done playing it safe.",
      hero: "Who we work with",
      intro: "DOITSILLY isn't for every brand. We're for the ones done playing it safe.",
      who: [
        ["Brands seeking authentic engagement", "Companies that value creative partnerships over transactional sponsorships. Organisations willing to collaborate meaningfully with emerging talent."],
        ["Founders challenging convention", "Entrepreneurs who understand that memorable brands don't emerge from safe choices. Founders building companies that reflect their authentic vision, not investor-friendly templates."],
        ["Startups that want to look human", "Early-stage companies that know their brand needs to work as hard as their product, and want a creative partner who gets that."]
      ],
      whoClose: "We work with startups building sustainable fashion, founders launching mental health apps, B2B companies that want to look human.",
      personality: ["Curious", "Warm", "Playful", "Honest", "Slightly chaotic"],
      next: "team"
    },
    team: {
      type: "team", landmark: "The Scribble Crew", plain: "Team", oneliner: "The scribbles behind the scribbles.",
      hero: "The scribbles behind the scribbles",
      intro: "A small studio with a big room behind it.",
      team: [["[Name]", "[Role]", "Thinks in pizza slices."], ["[Name]", "[Role]", "[One silly line]"], ["[Name]", "[Role]", "[One silly line]"]],
      whereHeading: "Where you'll find us",
      where: "DOITSILLY Studio operates out of 3rd Space in Indiranagar, Bangalore. Positioned at the centre of the city's creative and startup ecosystem, our physical presence signals something most agencies can't offer: a living, breathing community of emerging creative talent right behind the studio wall.",
      next: "story"
    },
    contact: {
      type: "contact", landmark: "The Big Red Mailbox", plain: "Start a project", oneliner: "Pop it in the post. We'll make it pop.",
      hero: "Pop it in the post. We'll make it pop.",
      intro: "Half-formed is fine. That's our favourite kind.",
      needs: ["Design", "Strategy", "Content", "Production", "Tech", "A collab with the Community", "The accelerator", "Not sure yet"],
      budgets: ["[RANGE 1]", "[RANGE 2]", "[RANGE 3]", "Let's talk"],
      timelines: ["ASAP", "This month", "In 1–3 months", "No rush"],
      privacy: "We'll only use this to reply to you. No newsletters unless you ask.",
      nextSteps: ["A real (slightly silly) human replies within 2 working days.", "We get on a call and ask a lot of questions.", "You get a proposal that sounds like us, priced like grown-ups."],
      talk: "Email [EMAIL] · WhatsApp [NUMBER] · Or come by 3rd Space, [ADDRESS], Indiranagar. The kettle's usually on.",
      success: ["Stamped and sent.", "Got it, {name}. We'll reply to {email} within 2 working days. In the meantime, have a look at the Fridge Door."],
      next: "design"
    }
  },

  /* Community landing page (#/community). Draft copy: check it with the community team before launch.
     The community is called "the DOITSILLY Community"; "3rd Space" only appears as the address. */
  community: {
    kicker: "DOITSILLY Community · Bangalore",
    hero: "Creatives, gathered.",
    intro: "The DOITSILLY Community is the room behind the studio wall. Illustrators, filmmakers, writers, musicians and developers come here to make things, show things and meet the people who'll make the next thing with them.",
    join: "Join the Community",
    joinUrl: "[COMMUNITY JOIN LINK]",
    visit: "Come say hi",
    spotsHeading: "What happens in the room",
    spots: [
      { name: "Crayon Corner", line: "Drawing nights, zine days and workshops. Bring a pen, leave with a page.", art: "art/cast/crayon.svg", tone: "lime" },
      { name: "The Jam Room", line: "Small crews, short sprints. Pitch an idea on Monday, show it on Friday.", art: "art/cast/toast_dj.svg", tone: "blue" },
      { name: "Open Mic Pier", line: "Show-and-tell, screenings and crits. Half-finished work is the point.", art: "art/cast/cam_director.svg", tone: "pink" },
      { name: "The Snack Shack", line: "The kettle's on. Come for chai, stay for the conversation.", art: "art/cast/pizza_guy.svg", tone: "sand" }
    ],
    studioHeading: "Get paid to make things with the studio",
    studioIntro: "When a DOITSILLY project needs a different hand, we ask the room first.",
    studioRoles: [
      ["Illustrators and type nerds", "Characters, lettering and worlds for brand identities."],
      ["Directors, editors and motion designers", "Shoots, post and social video."],
      ["Writers and creators", "Content that doesn't look like an agency made it."],
      ["Developers", "Open tools for the Free Library, and the odd client build."]
    ],
    accelerator: ["The accelerator", "[ONE OR TWO LINES ON THE ACCELERATOR: who it's for, how long, how to apply]"],
    whereHeading: "Find the room",
    where: "3rd Space, [STREET ADDRESS], Indiranagar, Bangalore [PIN]. Open [DAYS AND HOURS].",
    brandsHeading: "Are you a brand?",
    brands: "Work with the people in this room through the studio: collabs, creator content and real voices, not sponsored posts.",
    closing: "See you in the room."
  },

  /* The optional full experience (camera head tracking). */
  fx: {
    button: "View full experience",
    loading: "Waking up the camera...",
    on: "Lean left, right, in and out to look around.",
    mouse: "Move your mouse to look around.",
    privacy: "Your camera stays on this device. Nothing is recorded or sent.",
    denied: "No camera, so your mouse moves the view instead.",
    exit: "Exit full experience"
  },

  /* Things in the solar system answer when clicked. */
  space: {
    wish: "Wish #{n} made",
    sun: { name: "The Sun", lines: ["Shades on. Too bright to brainstorm without them.", "Sunscreen: SPF one thousand.", "I run on pizza energy."] },
    satellite: { name: "DOITSILLY Sat", lines: ["Signal from DOITSILLY: come in, the kettle's on.", "Beep. Uploading silliness."] },
    rocket: { name: "Rocket", lines: ["Zoom zoom!", "Next stop: your brand.", "Full speed. No brakes."] },
    bot: { name: "Astro-bot", lines: ["Houston, we have an idea.", "Floating. Thinking. Same thing."] },
    ghost: { name: "Ghost", lines: ["Boo! I'm the ghost of boring brands.", "Don't worry. I only haunt templates."] }
  },

  /* Island locals: click one to say hi. Keys match the character art in art/cast. */
  locals: {
    scribble: { name: "Scribble", lines: ["I'm the O in DOITSILLY. Hi!", "Messy ideas welcome. Messy hair too.", "I was a doodle once. Now I'm a brand."] },
    pizza_guy: { name: "Pizza Pal", lines: ["Three slices out of eight. That's maths. That's dinner.", "Fractions are just pizza. Tell your teacher."] },
    fraction_pizza: { name: "3/8 Slice", lines: ["I'm three-eighths of a great idea.", "Hold me by the crust, please."] },
    toast_dj: { name: "DJ Toast", lines: ["Now spinning: the toast of the town.", "Drop the bass. Not the butter."] },
    bot2: { name: "Beepo", lines: ["Beep. I do the boring bits.", "I made a spreadsheet do a backflip."] },
    crayon: { name: "Crayon", lines: ["I colour outside the lines. On purpose.", "Sharpened and ready."] },
    stamp_guy: { name: "Stampy", lines: ["Approved. Stamped. Silly.", "Every brief gets a stamp. House rules."] },
    postit_stack: { name: "Post-its", lines: ["Write it down before it flies away.", "We stick around."] },
    cam_director: { name: "Director Cam", lines: ["Lights, camera, pizza!", "From the top. With feeling."] },
    clapper: { name: "Clappy", lines: ["Take 47. Still silly.", "Clap clap. That's a wrap."] },
    bulb: { name: "Bulb", lines: ["Ding! Idea.", "I switch on when someone says 'what if'."] },
    dish_head: { name: "Dishy", lines: ["Picking up signals from the Community.", "Loud and clear. Mostly clear."] },
    paint_bucket: { name: "Splash", lines: ["Splash first, ask later.", "Pick a colour. Any colour. Pink."] },
    pencil_kid: { name: "Pencil Kid", lines: ["Sketch it ugly, then make it pretty.", "My eraser is my best friend."] },
    heli: { name: "Heli", lines: ["Aerial shots, anyone?", "Hovering. Waiting for the tour."] },
    blimp_small: { name: "Blimpy", lines: ["Floating ideas over the island.", "Full of hot air. In a good way."] },
    _default: { name: "A local", lines: ["Hi! Welcome to Silly Town."] }
  },
  visit: "Visit {place}",
  hi: "Locals met: {n} of {m}",
  hiDone: "You've met every local. Honorary silly citizen!",
  ferry: { name: "The Silly Ferry", lines: ["All aboard!", "Toot toot! Next stop, the other island."] },

  errors: {
    required: "We need this one.",
    email: "That email looks a bit off. Check for typos?",
    sendFailed: "Something tangled on our side. Your message is safe here, try again.",
    mapFailed: "The map's being shy. Here's everything as a list instead."
  },

  notFound: { headline: "You've wandered off the map.", body: "Even our scribbles get lost sometimes. This page doesn't exist, or it moved without telling us." },

  list: { headline: "Everything, no map.", sub: "For keyboards, screen readers and people in a hurry. Same places, plain list." },

  social: [["Instagram", "[INSTAGRAM URL]"], ["LinkedIn", "[LINKEDIN URL]"], ["Behance", "[BEHANCE URL]"], ["GitHub", "[GITHUB URL]"]]
};
