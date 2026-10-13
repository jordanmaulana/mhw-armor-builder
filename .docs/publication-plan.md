# Publication plan

How the builder goes from a finished page on a laptop to a tool hunters use: what has to be true
before anyone is told, where it is announced and in what order, how support is asked for, and
what gets measured. Written on 13 October 2026, the day after `mhwbuilder.com` was registered.
Facts about the repository are as of commit `3d73819`. Facts about the outside world were read
on the same day, and the last section says where each one comes from.

## 1. The short version

**The goal** is hunters who use the builder and come back to it, and a Ko-fi page that covers
what it costs to run.

**It is for hunters still in the story**, the ones who ask "what should I make next?". It is not
yet for hunters who optimise at endgame.

**The pitch:** name the skills you want, mark the monsters you haven't beaten, and it finds the
best armor set from what's left.

**The order:**

1. **Get ready (this week).** Put the site live, measure it, cache it, give it its own favicon
   and a way to report a wrong number. Nothing is posted before that.
2. **Small rooms first (week 1).** The Indonesian communities, where you are a native voice and
   a mistake is found by a few hundred hunters and not a hundred thousand.
3. **Wider (weeks 2 and 3).** The large Discord servers, one a day, and two write-ups for
   developers.
4. **Reddit last (about week 5).** It is the largest room and the one a new account cannot walk
   into. The account is opened this week and spends a month answering questions before it posts
   a link.
5. **Three hours a week through week 8**, then a review against the numbers of week 1.

**Three things decide how it goes:**

- **Nothing is measured yet.** With no analytics, a launch today would leave no way to tell
  which room sent hunters or whether they searched for anything.
- **The pitch is not yet true for the hunters it is aimed at.** The unslain list has no rank, so
  a monster beaten at Low Rank unlocks its Master Rank armor. A rank setting (section 10) comes
  before Reddit.
- **Capcom's music is the largest risk.** Capcom's Video Policy says game soundtracks "may not
  be posted or distributed separately and apart from game footage", and two of them are on the
  site and in the public repository. The decision to keep them is recorded in 9.1, with what to
  do if a notice comes.

**The number to watch** is the share of visits that open with a saved build: a hunter who came
back.

## 2. Where things stand

| What | State on 13 October 2026 |
| --- | --- |
| The site | Not live. `mhwbuilder.com` has Rumahweb's name servers and no A record. |
| The server | One you already have. Going live is DNS, TLS and `./update.sh`. |
| The catalog | 1,670 armor pieces, 1,792 Master Rank weapons, 404 decorations, 314 charms, 130 skills, 94 monsters. |
| Analytics | None. No script in `frontend/`, so a launch today could not be measured. |
| Favicon | Still Vite's purple bolt (`frontend/public/favicon.svg`). |
| Share card | Built (`og.jpg`), never tested from the live domain. |
| Ko-fi | Linked from the header. The page answers 403 to a script, so its state is yours to check. |
| Reporting a wrong number | No link on the page. |
| Sharing a build | Not possible. A build lives in the browser's localStorage and nowhere else. |
| First visit | An empty search: one line of text and an `Add skill` button (`set-search.tsx`). |
| The catalog API | Uncached. A first visit is seven Django requests, served by three gunicorn workers. |
| Icons | Every one is loaded from Fextralife's image host, with the referrer withheld. A refused icon leaves an empty plate, not a broken row (`equip-row.tsx:54`). |
| Music | Two of Capcom's Seliana tracks (13.7 MB) are in `frontend/public/audio/`, and in the public GitHub repository. |
| Other third parties | Google's sign-in script loads on `/` (`frontend/index.html:31`), though only `/login` uses it. Fonts are self-hosted. |

## 3. Who it is for, and what to say

### 3.1 Who

**Hunters who are still in the story.** New players and returning ones, anywhere between the
first Great Jagras and the end of Iceborne's story. The question they ask, every day and in
every community, is "what should I make next?". The unslain list is the builder's answer to
that question: mark what you have not beaten and the search leaves that armor out.

World is still played. On Steam alone it averaged 15,588 players at once over the last 30 days,
with a peak of 34,562, and September was up 2% on August. How many of them are still in the
story is not known.

**Not yet: hunters who optimise at endgame.** Their builds are made of Iceborne set bonuses,
secret-skill caps and level 4 jewels, and the search models none of the three (section 3.3).
Shown there first, the builder gets the one criticism it cannot answer, and gets it in the
rooms whose opinion travels furthest. They are the second launch (section 10).

### 3.2 The pitch

> Name the skills you want, mark the monsters you haven't beaten, and it finds the best armor
> set from what's left.

Once the rank setting exists (section 10) the last words become "the best set you can craft
right now". Until then they would not be true.

What stands behind it, each of which a doubter can check:

- **The search is exact.** The first result is the best build in the catalog, not a good guess,
  and `recommend.test.ts` holds it against brute force.
- **It answers as you type.** The median search takes a millisecond and twelve damage skills at
  their cap take 0.2 s on a laptop (`recommended-set.md`, section 8).
- **The whole Iceborne catalog is in it.** 1,670 armor pieces, 1,792 Master Rank weapons, 404
  decorations, 314 charms.
- **The numbers are the game's.** Every field was settled against datamined sources, which
  overruled the wiki on 71 armor fields and 355 weapon fields.
- **No login, no ads, free, and it works on a phone.**

### 3.3 What it does not do, said first

Every post names these itself, before a commenter does. A limit the author states is a roadmap;
the same limit found by a reader is a flaw.

- **It is not a damage calculator.** Attack and affinity are the weapon's own numbers with no
  skill applied.
- **Iceborne set bonuses are not modelled.** Base-game bonuses are shown; no Master Rank piece
  has one.
- **Skills stop at their normal cap.** Secret levels are not unlocked.
- **The search places no level 4 combo or "+" jewels.** They can be put in by hand and then
  count in full.
- **Weapons are Master Rank only**, and a weapon adds its jewel slots and its defense bonus,
  nothing else.
- **A monster is slain or not, at no particular rank**, and charms are not filtered by it.

### 3.4 One message for each audience

| Audience | What they hear |
| --- | --- |
| Hunters, in English | The pitch, a short clip of a search with two monsters marked, the limits. |
| Indonesian hunters | The same, in Bahasa Indonesia, from one of their own. The skill names stay in English, as they are in the game. |
| Developers | Not the tool but how it was made. Two stories: an exact search that runs in the browser, and a dataset in which the wiki turned out to be wrong one time in a hundred. |

### 3.5 What else a hunter can use

| Tool | State on 13 October 2026 | What it means here |
| --- | --- | --- |
| Honey Hunter World's builder | Gone. The address no longer serves it, and a November 2024 thread says it "has been down for quite a while". | The builder that old guides and old threads link to is a dead link. Hunters are asking what to use instead. |
| MHW Wiki DB set search | Works, and is the community's answer: a reply in a November 2024 thread calls it "the only functional one that builds for you". Its search uses level 4 decorations. It carries ads, and its only filter by progress is by rank. | The one real rival. It is ahead at endgame and has nothing by monster, which is why the plan leads with the story and not with endgame. Its rank filter is also why the rank setting in section 10 is not optional. |
| Athena's ASS, MHArmory | Windows programs, last changed in February 2024 and July 2023. Athena's site is parked for sale. | Nothing for a phone or a browser. |
| mhw-builder.com | Loads. Last changed in 2018, before Iceborne. | Not a rival for an Iceborne hunter. |

No tool was found that filters by monsters hunted. The search for one was not exhaustive, so the
posts say what the builder does and never that it is the only one that does it.

## 4. Before anything is announced

A first impression is spent once. Everything in 4.1 is done before the first link is posted
anywhere, the small rooms included.

### 4.1 Blockers

1. **The site is live at `https://mhwbuilder.com`.**
   - An A record for the apex, and `www` redirecting to it. The share tags, `robots.txt` and
     `sitemap.xml` all name the apex.
   - A reverse proxy with TLS on the host, in front of `127.0.0.1:8014`. The frontend container
     publishes nothing else.
   - In `.env.docker`: `DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,mhwbuilder.com` and
     `DJANGO_CORS_ALLOWED_ORIGINS=https://mhwbuilder.com`. The first two hosts are the
     healthcheck's: without them the backend stays unhealthy and the frontend never starts.
   - `./update.sh`, then `make mg CMD="seed"` once. Migrations run on boot; the catalog does not
     load itself.
   - Done when `/api/v1/armors/` returns 1,670 rows, `https://mhwbuilder.com/og.jpg` comes back
     as `image/jpeg` (a missing file comes back as the page, with a 200), and a search for
     Critical Eye 7, Weakness Exploit 3 and Attack Boost 4 returns sets.
2. **Visits are measured, and so is what visitors do.** Section 8 lists the events. The tool has
   to be cookieless, so that no cookie banner is needed, and it has to take custom events,
   because a page view says nothing about whether a search was run. Self-hosted Umami fits both
   and the stack: it is one more container beside a Postgres that is already there. Cloudflare
   Web Analytics is free and cookieless but takes no custom events, so it is not enough alone.
3. **The catalog is served from a cache.** The seven list routes are public, carry no token and
   change only when `seed` runs, so nginx can answer them itself. Measure first: run a load tool
   against `/api/v1/armors/` at 50 concurrent requests before and after. Done when a repeated
   request leaves no line in the backend's access log.
4. **The favicon is the builder's own**, with a PNG beside the SVG for the browsers and chat
   apps that take no SVG.
5. **There is a way to report a wrong number.** The repository is public, so a footer link to
   its GitHub Issues costs one line. The dataset was settled against datamined sources and that
   is a strength, but only if a hunter who finds a mistake can say so and see it fixed.
6. **The share card previews where it will be posted.** Paste the live link into a private
   Discord channel, a WhatsApp chat with yourself, Facebook's Sharing Debugger and a draft post
   on X. These crawlers cache the image: a changed card needs a new file name.
7. **Search engines know the site.** Verify the domain in Google Search Console and Bing
   Webmaster Tools and submit `sitemap.xml`. It costs ten minutes and the clock on indexing
   starts then.
8. **The Ko-fi page is finished** (section 7).

### 4.2 Worth doing before the widest channel

None of these stops a soft launch. All of them should be in before Reddit, which is last for
other reasons (section 5) and so leaves the time.

- **Decide about the icons, and probably leave them.** If Fextralife's host starts refusing the
  requests, every row loses its icon at once, most likely on the day traffic is highest. The
  page survives it: a refused icon is an empty plate. Copying the files to the server would end
  the dependence, and would mean hosting about 2,700 of Capcom's images where today the page
  only links to them (9.1). Keep linking, and mirror only if the icons are in fact refused.
- **Take Google's script off `/`.** The pitch says "no login". A page that keeps that promise
  should not load a sign-in script from Google for every visitor. Load it on `/login` only.
- **A privacy line in the footer.** With cookieless analytics and Google's script gone it is two
  true sentences: builds are saved in your browser and nowhere else; visits are counted without
  cookies.
- **Hide the 33 pieces that are probably not in the game.** `Anja Helm+`, `Beo Helm+` and the
  rest of the five "+" sets, Direwolf and the three Ingot pieces have no recipe in any source and
  no slots. The search rarely picks them, but the armor picker lists them, and a hunter who
  knows the game will notice armor that is not in it.

### 4.3 The rest of `todoo.md`

| Item | Verdict |
| --- | --- |
| 5 analytics | Blocker 2. |
| 6 favicon | Blocker 4. |
| 9 CTA above the fold | The one-tap example in section 10. |
| 12 alt text | One pass. The icons are decorative and already carry `alt=""`. |
| 13 mobile breakpoints | The recent features were checked at 320 and 390px as they were built. One pass over the whole page, then tick it. |
| 17 privacy policy | The privacy line in 4.2. A page of its own is not needed while nothing personal is collected. |
| 19 cookie banner | Not needed, as long as analytics is cookieless and Google's script is off `/`. |
| 20 contact address | Blocker 5. |
| 14 sticky mobile CTA, 15 form error states, 16 thank-you page, 18 terms | Do not apply. The page has no form, no signup and nothing to buy. |

## 5. Where it is announced

The rooms come in order of how forgiving they are, smallest first. Reddit is last, though it is
the largest, for the reason in 5.5.

### 5.1 Rules for every room

- **One room a day, and stay for the day.** A post whose questions go unanswered for a night
  was not worth making. Post when the next several hours are free.
- **The limits are in the post** (3.3).
- **Ko-fi is never mentioned off the site.** r/MonsterHunterWorld's rule 5 forbids "asking for
  money, donations", and Steam's conduct rules forbid "begging". The heart on the page is the
  whole ask (section 7).
- **Never the same text twice.** The drafts in section 12 are where a post starts, not what
  gets pasted.
- **Every link is tagged** with the room it was posted in (8.1).
- **Where the rules are silent, ask a moderator first.** A post a moderator agreed to can be let
  through a filter, and is not read as spam.

### 5.2 Indonesian communities (week 1)

| Room | Size | Note |
| --- | --- | --- |
| Monster Hunter Indonesia (Discord) | 9,146 members | Founded February 2018, covers World and Rise. |
| Rise of Monster Slayer (SSS) | About 2,400 | From a search snippet only. |
| Moves Like Jagras (Steam group) | Not counted | Turned up in the search for Indonesian groups. Check that it is one before posting. |
| Facebook groups | None confirmed | A search could not see into them. You know which ones are alive. |

They are first because a builder made by an Indonesian hunter is news there in a way it is
nowhere else, because every reply can be answered in person, and because what goes wrong goes
wrong in front of hundreds.

Draft A is the post. What to bring back from the week: the first real numbers (8.2), the first
reports, and the words hunters themselves use for what the builder does. Those words go into
the later posts.

### 5.3 Discord (from week 2)

| Server | Size |
| --- | --- |
| Monster Hunter Gathering Hall | 253,207 members, a Discord partner |
| Monster Hunter Hub | About 109,000, by a third-party listing |

Neither server's channel list nor its rule on posting your own project can be read from outside.
Join, read the rules channel, and look for where fan projects or resources go. If there is no
such place, ask a moderator, and do not post in a help channel uninvited. Draft B is the post.

The post is the smaller half of Discord. The larger half is answering build questions in the
World channels as a hunter, twice a week, with the set as the answer. Once a link can carry a
search (section 10) the answer and the link are the same thing.

### 5.4 Developers (weeks 2 and 3)

The goal is players, and this channel still serves it. Links from developer sites are the kind
search ranking is built on, and search is where a hunter looking for a builder starts.

Two write-ups, so that each post has something to be about:

1. **An exact armor set search that runs in the browser.** `recommended-set.md` is this article
   already. It needs an opening for a reader who has never played, and the link.
2. **The wiki was wrong one time in a hundred.** How four sources were settled against each
   other: 71 armor fields and 355 weapon fields overruled, 25 of 964 item pages on one site that
   open another item's page because its ids differ only by letter case, and why "two against
   one" settles nothing when one source lists the other two among its own. The notes are in
   `CLAUDE.md`.

They live on a blog of your own or on dev.to. The builder goes to Hacker News as a Show HN,
which is for things a reader can try at once, and a page with no login is that. The title is
plain, and nobody is asked to upvote it (draft D).

One caution. This is the audience that opens the repository, and the two music tracks are in it
(9.1).

### 5.5 Reddit (when the account qualifies)

As read on 13 October 2026. Read each one again before posting.

| Subreddit | Weekly visitors | Rule on your own tool | What stops a new account |
| --- | --- | --- | --- |
| r/MonsterHunterWorld | 125,033 | Rule 5: "Self-Promotion that is thoughtful and well received, may be posted, as long as it is not excessive". | A filter with no published threshold. Two tool posts from February 2025 are still marked as filtered, at a score of 1 with no comments. |
| r/MonsterHunter | 460,947 | One post of your own for each one that is not. Read from an archive, not the live page. | AutoModerator removes posts "because of your account age, or because your Reddit-wide karma is below 20". The age is not stated. |
| r/MonsterHunterMeta | 69,126 | "Sharing external content you created… is allowed within reason… we suggest you follow the 9:1 ratio." A post needs body text. | AutoModerator removes a post when "you don't have enough karma". The number is not published. Comments are filtered too. |

So the only published number is 20 karma, and no subreddit publishes a waiting time. A new
account whose first act is a link to its own site is what those filters are for.

It is worth the wait. Honey Hunter's builder is gone, and threads in r/MonsterHunterWorld ask
"what armor set builder are we using". That is the question the launch post answers.

The path:

1. **Week 0: open the account.** Its age is the one thing that cannot be hurried.
2. **Weeks 1 to 4: be a hunter there.** A few answers a week in r/MonsterHunterWorld, with no
   link. Start there and not in r/MonsterHunterMeta, which filters the comments of low-karma
   accounts too.
3. **Week 4: write to the moderators** of r/MonsterHunterWorld (draft E). One sentence, the
   link, and the question.
4. **Week 5: the post** (draft C), in r/MonsterHunterWorld only. Ten minutes later, look at it
   from a browser that is not logged in: a filtered post looks fine to its author.
5. **Later, in other weeks:** r/MonsterHunter, once the one-for-one is met. Not
   r/MonsterHunterMeta before item 4 of section 10 ships.

What the post looks like comes from what worked before:

| Post | Where and when | Score | What it was |
| --- | --- | --- | --- |
| "Monster Hunter Rise Builder - Updated for 3.0 Patch" | r/MHRise, May 2021 | 682, 54 comments | One screenshot. |
| "Created a web app tool for the Iceborne Guiding Lands Material Calculator" | r/MonsterHunterWorld, October 2020 | 469, 23 comments | A GIF of it in use. |
| "I Created A Monster Hunter Wilds Build Planner!" | r/MHWilds, March 2025 | 380, 70 comments | The link, two sentences, a request for suggestions. |
| "I made a web based armor set (+weapon) builder for MH World…" | r/MonsterHunterWorld, February 2018 | 227, 97 comments | Text: the link first, a feature list, the limits admitted, a call for bug reports. |
| "Wilds Set Search Open Source" | r/MonsterHunterMeta, March 2025 | 46 | A long text post. |

Show it, put the link first, keep it short, admit the limits, ask for bug reports. The one long
post with nothing to look at did far worse, though in a smaller subreddit.

### 5.6 Search and Steam, the slow ones

- **Search.** Blocker 7 starts the clock and the developer links feed it. Nothing else in this
  plan is for search (section 11).
- **One Steam guide, from week 6, if there is an hour.** World's hub has 588 English guides and
  none of the popular ones covers a set builder. Steam's conduct rules forbid "posting
  advertisements", so it has to be a real guide ("Choosing armor during the story") in which the
  builder is the tool for one step.

## 6. The calendar

The dates assume the site goes live this week. If that slips, every row slips with it and the
order stays. The publication column is the three hours a week. The product column is on top of
them.

| Week | Dates | Publication | Product |
| --- | --- | --- | --- |
| 0 | 13 to 18 Oct | The blockers of 4.1. Open the Reddit account. Finish the Ko-fi page. | |
| 1 | 19 to 25 Oct | Monster Hunter Indonesia, then the other Indonesian rooms, one a day. Answer everything. Read the first numbers on Sunday. | Hide the 33 doubtful pieces. The one-tap example, if fewer than half of visitors start a search. |
| 2 | 26 Oct to 1 Nov | Join Gathering Hall and Hub, read their rules, post where it is allowed. Publish write-up 1. | The rank setting. |
| 3 | 2 to 8 Nov | Show HN. Publish write-up 2. | The link that carries a search. |
| 4 | 9 to 15 Nov | Write to r/MonsterHunterWorld's moderators. Record the clip for the post. | The rest of 4.2. |
| 5 | 16 to 22 Nov | The Reddit post, on a day whose evening is free, and the day after it too. | Fix what Reddit finds. |
| 6 | 23 to 29 Nov | Answer build questions. The Steam guide, if there is an hour. | |
| 7 | 30 Nov to 6 Dec | Answer build questions. r/MonsterHunter, if the one-for-one is met, and not on Friday the 4th. | |
| 8 | 7 to 13 Dec | Review: this week's numbers against week 1. Write the targets for the next two months. | Decide on the second launch. |

A week of rhythm is one hour answering questions in the rooms, one hour on reports and their
fixes, and one hour on the week's single outward thing.

Dates outside the plan's control:

- **4 December 2026: Wilds comes out on Switch 2** (by a press report, read as a search
  snippet). r/MonsterHunter will be about little else that week, so a World tool posted on the
  day is posted into noise.
- **17 December to 4 January: Steam's Winter Sale.** Not a date to plan around. Last winter's
  sale months moved World's average player count by 3.9% and 2.3%.
- **Jumps in World's player count.** April 2026 was up 52% and June up 67%, for reasons that
  were not found. Look at the chart on the weekly hour: a jump is new hunters arriving, and the
  week to be in the rooms.
- **9 and 26 January 2027:** seven years of Iceborne on PC, nine years of World. The community
  marks the second by itself, which makes it the natural date for the second launch.

## 7. Ko-fi

The aim is that the builder pays for itself: the domain, and its share of the server.

- **The ask lives on the site and nowhere else** (5.1).
- **The Ko-fi page says what the money pays for.** A goal bar set to the real monthly cost, and
  one paragraph: a free tool, one hunter's project, donations keep it running. And the line the
  footer already has: fan-made, not affiliated with or endorsed by Capcom.
- **Nothing is sold.** No supporter features, no perks, no early access, no ads. Capcom's fan
  guidelines do not permit "any monetization", and the allowance for voluntary contributions in
  its Video Policy is written for videos. So the Ko-fi link is itself part of the risk in 9.1.
  Keeping the ask to running costs and selling nothing is what can be done about that short of
  taking the link off.
- **One quiet line besides the heart.** Below `md` the heart is an icon with no word beside it.
  A sentence next to the "Fan-made" line in the footer gives the ask a second place.
- **When someone asks how to help**, the answer is the link, and that a bug report helps as
  much.

Reading the numbers:

| What is seen | What it means |
| --- | --- |
| Almost no `kofi_click` | The ask is not seen. Reword or move it. |
| Clicks and no donations | The Ko-fi page does not convince, or is not finished. |
| Both in proportion | More visitors is the only lever left. |

Few visitors to a free tool give anything. Plan on the costs being covered late or in part, and
count the goal bar reaching one month's cost as the success.

## 8. What to measure

### 8.1 Events

Eight, each of which answers a question below. More than that and nobody reads them.

| Event | Fires when |
| --- | --- |
| `search_started` | The wanted list goes from empty to not empty, once per visit. |
| `set_chosen` | A recommended set is clicked. |
| `unslain_marked` | A monster is marked, once per visit. |
| `row_locked` | A row is locked, once per visit. |
| `weapon_picked` | A weapon is chosen, once per visit. |
| `returned` | The page opens with a saved build or a saved wanted list. |
| `kofi_click` | The heart is clicked. |
| `report_click` | The report link is clicked. |

`returned` is there because cookieless analytics cannot follow a visitor from one day to the
next. The builder already can: a page that opens with a build in localStorage is a hunter who
came back.

Every link posted carries a tag for where it was posted (`?utm_source=discord-<server>`,
`?utm_source=fb-<group>`), so each room can be told apart.

### 8.2 The weekly numbers, and what each one decides

| Number | What it decides |
| --- | --- |
| Visits, by source | Which rooms are worth the next hour. |
| Share of visits with `search_started` | Whether the first screen works. If fewer than half the visitors of the soft launch start a search, the one-tap example goes in before anything wider. |
| Share of searches with `set_chosen` | Whether the answers are any good. Low means the sets are not what hunters wanted: read the reports before posting more. |
| Share of visits with `returned` | Whether it is a tool or a curiosity. This is the number the goal "players using it" comes down to. |
| Share of searches with `unslain_marked` | Whether the hook in the pitch is the feature hunters use. If almost nobody marks a monster, the pitch or the button is wrong. |
| `kofi_click` per 1,000 visits, and donations | Whether the ask is seen at all, separately from whether it is answered. |
| Reports opened and closed | Whether trust is being kept. A report closed within a day is worth a post. |
| Search Console impressions and clicks | Whether search has started to send anyone. Expect nothing for weeks. |

The "half" above is a starting guess, not a benchmark. No absolute target is set here: the soft
launch week gives the first real numbers, and the target for week 8 is written then, as a
multiple of that week.

## 9. What can go wrong

### 9.1 Capcom's material, with a donation link beside it

Three things on the page are Capcom's, used as they are: the two Seliana tracks, the backdrop
(Iceborne's Steam store background) and the icons, which the page links to and does not host.

What Capcom has published, read on 13 October 2026:

- **Fan Content Guidelines, 4 November 2025.** They permit derivative works, and then: "the act
  of processing or using our materials as is or without any creative input does not constitute
  a derivative work, and is not subject to the permissions granted under these Guidelines."
- **The same guidelines:** "Commercial use, including use of our intellectual property to
  promote or market commercial products or services or any monetization or intellectual
  property, is not permitted". The one exception is small runs of fan books.
- **The same guidelines:** "Capcom may in its sole and absolute discretion, require that the use
  of Capcom property in a derivative work be discontinued."
- **Video Policy, 15 March 2021:** "Game soundtracks may not be posted or distributed separately
  and apart from game footage."

This is a reading and not legal advice: none of the three is covered by the permission, the
music is the one use Capcom names outright, and a donation link sits under "any monetization".
The guidelines also ask fans not to use the ©CAPCOM notation, so the footer's "Fan-made tool.
Not affiliated with or endorsed by Capcom." is right as it stands.

What has happened to others: no action by Capcom against a Monster Hunter fan site, database,
tool or repository was found. GitHub's public record of takedown notices was not searched.
Capcom does act elsewhere: the developer of a free fan game, "Sega VS Capcom", shut it down in
September 2026 over Capcom's characters (a press report, read as a snippet), and in 2023 players
reported takedowns of videos that showed mods.

**The decision, taken on 13 October 2026: the tracks stay, on the site and in the repository.**
It was taken before the Video Policy's sentence had been read, which is why the sentence is
quoted here in full.

Three things make the exposure larger, in this order: the developer audience, which opens the
repository; Reddit, which has the most eyes; and the Ko-fi link.

**If a notice comes:**

1. Do what it asks the same day and answer in two lines. Do not argue the case.
2. **The music.** Delete the two files in `frontend/public/audio/`, take `SoundToggle` off the
   page, run `./update.sh`. Nothing breaks in between: with the files gone the toggle only snaps
   back to off.
3. **The repository.** A deleted file stays in git history. Taking it out means rewriting
   history and force-pushing. If the notice went to GitHub, read it for the deadline: the owner
   is normally given time to remove what is named before the repository is disabled.
4. **The backdrop.** Delete `frontend/public/img/backdrop.webp`. The page falls back to the
   plain cobalt glow, as it was built to. The share card shows the backdrop too, so `og.jpg` is
   redrawn under a new file name.
5. **The icons.** They are links. Blanking the `icon_url` fields leaves empty plates.

### 9.2 Fextralife refuses the icons

The requests withhold the referrer, which hides where they come from and not that they come.
If the host refuses them the rows show empty plates and the page works (4.2). Mirror then.

### 9.3 A burst of visitors

A post that does well sends its visitors within hours, not days, and each first visit is seven
requests to three workers. Blocker 3 is the answer, and the load test in it is how to know
before the day.

### 9.4 A wrong number

It will happen, and in public. The answer is the same every time: thank the hunter, fix it
within a day, say in the same thread that it is fixed. A dataset that is corrected in the open
is trusted more than one nobody has caught out yet.

### 9.5 Read as spam, or filtered without a word

A new account, the same text in three rooms, a link in every answer: each of these gets a post
removed and the next one distrusted. One room a day, different words, a moderator asked first,
and a look at every post from a browser that is not logged in.

### 9.6 A week with no time

Nothing in the rhythm decays if a week is missed. The one rule is never to post in a week when
the replies cannot be answered.

## 10. Product work that publication depends on

The plan is not only posts. Four changes to the builder decide how well the posts work, and the
weeks Reddit has to wait (section 5) are when they get built. In order of what each one buys:

1. **A rank setting.** The pitch is aimed at hunters still in the story, and for them the
   unslain list is not enough: it knows a monster as slain or not, so Great Jagras slain at Low
   Rank unlocks its Master Rank armor, and nothing holds back Master Rank ore armor at all. A
   cap by rank (rarity 1-4, 5-8, 9-12) beside the unslain button makes "armor you can craft"
   true for the audience the plan leads with. Until it exists, the pitch has to say "leaves out
   the armor of monsters you have not beaten", which is what the filter does.
2. **A link that carries a search.** A build cannot be shared today. The wanted list is short,
   and because the search is exact, the same list gives the same sets: a link that carries the
   list (and the unslain monsters) reproduces the answer without carrying the build, whose 24
   character ids would make it long. This turns every build question answered in a Discord
   channel into a link to the tool with the answer on screen.
3. **A one-tap example.** One button in the empty search that loads Critical Eye 7, Weakness
   Exploit 3 and Attack Boost 4, the search on the share card. A visitor sees a result before
   learning the interface.
4. **Iceborne set bonuses, secret-skill caps and level 4 jewels in the search.** Endgame builds
   are made of exactly these, and the builder models none of them for Master Rank. This is not
   needed for the first launch. It is the second one: the day it ships is the day the builder
   can be shown to the hunters who optimise, and it is a reason to post again everywhere.

Low and High Rank weapons are a smaller gap for the same audience. The weapon row adds only its
jewel slots and its defense bonus, so a hunter below Master Rank leaves it empty and loses
little. The posts say so.

## 11. Not in this plan

- **Paid advertising.** The goal is cost recovery through Ko-fi. Buying visits works against it.
- **Video.** YouTube and short-form were not among the channels chosen, and a few hours a week
  does not stretch to them.
- **Pages built for search.** One page per skill or per monster would bring search traffic, and
  it is an ongoing project of its own. Only `/` is indexable today and this plan leaves it so.
- **Translating the interface.** The game has no Indonesian text, so the English names in the
  builder are the ones Indonesian hunters already see in the game.
- **A Discord server of the builder's own.** It needs moderating every day. GitHub Issues is the
  place for reports.
- **Other Monster Hunter games.** Rise and Wilds have their own data and their own builders.

## 12. Drafts

Starting points. Each is rewritten for the room it goes to, in your own voice, and the tag on
the link names that room. "The monsters you haven't beaten" becomes "what you can craft right
now" once the rank setting is in.

### A. Indonesian communities

> Halo para hunter. Saya bikin armor set builder gratis untuk Monster Hunter: World dan
> Iceborne: `https://mhwbuilder.com/?utm_source=discord-mhi`
>
> Cara pakainya: pilih skill yang kalian mau, urutkan dari yang paling penting, lalu tandai
> monster yang belum kalian kalahkan. Builder-nya langsung mencarikan set terbaik dari armor
> yang tersisa, decoration-nya sudah sekalian dipasang. Tanpa login, tanpa iklan, dan enak
> dibuka di HP.
>
> Yang belum ada: set bonus Iceborne dan secret skill. Jadi untuk sekarang lebih cocok buat yang
> masih jalanin story daripada buat build endgame.
>
> Ini proyek pribadi. Kalau ada angka yang salah atau ada bagian yang bikin bingung, kabari saya
> ya. Masukan kalian sangat membantu.

### B. Discord

> I made a free armor set builder for World and Iceborne:
> `https://mhwbuilder.com/?utm_source=discord-gh`
>
> List the skills you want in order of importance, mark the monsters you haven't beaten, and it
> finds the best sets from the armor that's left, with the jewels already placed. No login, no
> ads, and it works on a phone.
>
> It doesn't know Iceborne set bonuses or secret skill levels yet, so it's more use during the
> story than for endgame. If a number is wrong, I'd like to hear it.

### C. Reddit, r/MonsterHunterWorld

The post is a short clip or a GIF: three skills added, two monsters marked, a set chosen. The
text goes under it.

Title:

> I made a free World/Iceborne set builder that leaves out the armor of monsters you haven't
> beaten yet

Text:

> `https://mhwbuilder.com/?utm_source=reddit-mhw`
>
> You list the skills you want in order, mark the monsters you haven't beaten, and it searches
> every piece, charm and jewel for the best sets from what's left.
>
> - The search is exact: the first result is the best set there is for your list, not a guess.
> - The whole Iceborne catalog is in it.
> - No login, no ads, works on a phone.
>
> What it doesn't do yet: Iceborne set bonuses, secret skill levels, and level 4 jewels in the
> search (you can slot them by hand). It isn't a damage calculator.
>
> It's one hunter's project. If a number is wrong or something is confusing, tell me here and
> I'll fix it.

### D. Show HN

Title:

> Show HN: Exact armor set search for Monster Hunter: World, running in the browser

First comment:

> This is an armor set builder for Monster Hunter: World. You give it up to twelve skills in
> priority order and it returns the ten best full sets, with the jewels placed.
>
> The search is exact. It drops every piece that another piece beats, then runs a depth-first
> search cut by two bounds. Twelve skills at their cap take about 0.2 s over 1,670 armor pieces
> and 314 charms, on the main thread, and it is tested against brute force on small generated
> catalogs. Write-up: (link to write-up 1).
>
> The data took longer than the search. The wiki it started from is wrong on about one field in
> a hundred, so every field was settled against two datamined datasets. Write-up: (link to
> write-up 2).
>
> It does not model the expansion's set bonuses yet. Source:
> `https://github.com/jordanmaulana/mhw-armor-builder`

### E. To the moderators of r/MonsterHunterWorld

> Hi. I've made a free armor set builder for World and Iceborne, with no ads:
> `https://mhwbuilder.com`. I'd like to share it here once, as a post with a short clip. Is that
> all right under rule 5, and is there a flair you'd want on it? I won't post it again unless
> there is a real update.

## 13. Sources

Everything here was read on 13 October 2026. "Read twice" means the research pass and a second
fetch of the page agreed. "Read once" means the research pass alone. An archive or a snippet is
weaker than the page itself and is marked.

| What | Where | How it was read |
| --- | --- | --- |
| Capcom's Fan Content Guidelines | <https://www.capcom-games.com/en/fan-content-guidelines/> | Read twice |
| Capcom's Video Policy | <https://www.capcomusa.com/video-policy/> | Read twice |
| World's player counts | <https://steamcharts.com/app/582010> | Read twice |
| Steam's sale dates | <https://partner.steamgames.com/doc/marketing/upcoming_events> | Read twice |
| MHW Wiki DB: it loads, its ads, its level 4 search | <https://mhw.wiki-db.com/sim/?hl=en> | Read twice |
| MHW Wiki DB: its filter by rank | The same page | Read once |
| Honey Hunter's builder is down | <https://www.reddit.com/r/MonsterHunterWorld/comments/1guzsfk/honeyhunterworld_mhw_builder_lite_permanently_down/> | Read once. The address gave the research pass a 404 and a second fetch a 403 |
| "the only functional one that builds for you" | <https://www.reddit.com/r/MonsterHunterWorld/comments/1gr6x2y/builder_but_the_other_way_around/> | Read once |
| "what armor set builder are we using" | <https://www.reddit.com/r/MonsterHunterWorld/comments/1g8l1k0/what_armor_set_builder_are_we_using/> | Read once |
| Athena's ASS, MHArmory, mhw-builder | <https://github.com/AthenaADP/MHW-ASS>, <https://github.com/TanukiSharp/MHArmory>, <https://www.mhw-builder.com> | Read once |
| Rules and weekly visitors of r/MonsterHunterWorld and r/MonsterHunterMeta | The subreddits' own pages | Read once, in a browser |
| r/MonsterHunter's one-for-one rule | The Arctic Shift archive | Read once, archive |
| r/MonsterHunter's AutoModerator message | <https://www.reddit.com/r/MonsterHunter/comments/1x3wzqy/i_want_to_play_olds_game_and_i_dont_understand/pfeungq/> | Read once |
| The two filtered tool posts | <https://www.reddit.com/r/MonsterHunterWorld/comments/1iyq8u4/made_a_little_tool_to_keep_track_of_crowns/>, <https://www.reddit.com/r/MonsterHunterWorld/comments/1izaijs/made_a_little_tool_to_keep_track_of_obtained/> | Read once, archive |
| Scores of the five earlier posts | The Arctic Shift archive | Read once, archive. The counts may lag |
| Monster Hunter Gathering Hall | <https://discord.com/servers/monster-hunter-gathering-hall-120889695658967041> | Read once |
| Monster Hunter Hub | <https://discordbotlist.com/servers/mhw> | Read once, a third-party listing |
| Monster Hunter Indonesia | <https://discord.com/servers/monster-hunter-indonesia-414114671772303361> | Read once |
| Rise of Monster Slayer's size | A search result | Snippet |
| Steam's guides and conduct rules | <https://steamcommunity.com/app/582010/guides/>, <https://store.steampowered.com/online_conduct/> | Read once |
| Wilds on Switch 2, 4 December | <https://www.gematsu.com/2026/09/monster-hunter-wilds-for-switch-2-launches-december-4> | Snippet. The page refused the fetch |
| "Sega VS Capcom" shut down | <https://www.timeextension.com/news/2026/09/sega-vs-capcom-fan-project-shut-down-for-using-capcoms-characters-and-likeness> | Snippet. The page refused the fetch |
| Takedowns of mod videos, 2023 | <https://www.resetera.com/threads/capcom-is-issuing-copyright-strikes-takedown-requests-on-monster-hunter-videos-featuring-mods.793434/> | Read once. Players' reports, not Capcom's word |
| Iceborne on PC, 9 January 2020 | <https://www.rpgsite.net/news/9121-monster-hunter-world-iceborne-arrives-on-pc-on-january-9-title-updates-to-be-fast-tracked-> | Read once |

Looked for and not found:

- The karma or age a new account needs on r/MonsterHunterWorld, and the exact numbers on the
  other two subreddits.
- The channel lists and promotion rules of the two large Discord servers.
- Any Indonesian or Southeast Asian Facebook group.
- A Capcom notice in GitHub's public record of takedowns, which was not searched.
- The cause of the April and June 2026 jumps in World's player count.
- Whether your Ko-fi page is set up: it answers 403 to a script.
