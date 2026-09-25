# Suite Product Blueprint

**Status:** DECISION + OPEN QUESTIONS

Suite is the fan-facing experience layer. It should feel like the digital home of the fan's relationship with a team, not like athletic-department software and not like a generic sports database.

> **The team is the product. The Suite is the place you experience it.**

## Product Model

- **Suite** = the stable app/front door and experience system
- **Primary Team** = the fan's home team and default Suite
- **Other Teams I Follow** = additional team relationships the fan has chosen to keep
- **Active Suite** = the team Suite the fan is currently inside

Switching teams means entering another Suite. It does not change the Primary Team unless the fan explicitly makes that change.

A brief transition between teams can reinforce the spatial model:

> **Entering your [Team Name] Suite**

The installed app icon and neutral front-door identity can remain Suite because one fan can move between multiple team Suites.

## Core Product Pillars

### Connect

Help the fan quickly understand what is happening with the team.

- Home / Now
- Schedule
- Scores and results
- Rankings / standings
- Roster and players
- News and updates

### Experience

Turn important moments into cohesive experiences.

- Game Center
- Live updates
- Previews and recaps
- Highlights and media
- Key moments
- Contextual game-day information

### Participate

Create lightweight opportunities to be involved.

- Reactions
- Predictions
- Polls
- Game threads
- Sharing

### Belong

Make the relationship persistent and personal.

- Primary Team
- Other Teams I Follow
- Favorite players
- Personalized content
- Notifications
- Team identity throughout the experience

## Primary Navigation Concept

The exact navigation is an implementation decision, but the conceptual destination set is:

- Home
- Schedule / Games
- Team
- News / Media
- Game Center when a game is active

Navigation should adapt to context rather than forcing every feature into a permanent tab.

## Contextual Modes

### Game Day

Priority: immediacy, live state, score, context, participation.

### Post-Game

Priority: result, recap, key moments, stats, reactions, what comes next.

### Between Games

Priority: upcoming game, relevant news, roster/player updates, media, discussion.

### Offseason / Major News Cycle

Priority: recruiting, transactions, roster changes, spring and fall camp, signing-day moments, analysis, history, and the next season only when it becomes timely.

## Product Quality Bar

Suite should be:

- Fast
- Clean
- Accurate
- Useful
- Responsive
- Accessible
- Team-specific without being hard-coded

Accuracy is a product requirement, especially for scores, schedules, game status, and other high-frequency information.

## MVP Surface

The first consumer MVP should prioritize:

1. Home / Now
2. Schedule
3. Game Center
4. News / Updates
5. Team / Roster
6. Basic personalization
7. One or more lightweight participation features

## Future Product Roadmap

### Notifications

Notifications are an intentional future Suite capability, but are **deferred from the current implementation and current canonical UI work**. Do not introduce notification controls, bells, settings, permission prompts, or implied notification behavior until this capability is explicitly brought forward for product design and implementation.

When revisited, notification use cases, preference controls, delivery mechanics, platform constraints, and TeamOS responsibilities should be defined before UI implementation begins.

### Social Sharing and Presence

The canonical invitation language is:

> **Join [Name] in their Suite.**

For a named example:

> **Join David in his Suite.**

The phrase should not name the team. The shared destination and visual identity provide that context.

The same language should work from the first referral/share capability through later real-time social experiences:

1. **Share / referral** - the link opens the inviter's Active Suite.
2. **Presence** - friends can see when someone is in their Suite and choose to join.
3. **Shared experience** - game-day reactions, watch-together moments, participation, and community can become synchronous.
4. **Spatial experience** - far-future AR/VR can make a fan's Suite a persistent digital place people can enter together.

Opening another fan's shared Suite must not silently change the recipient's Primary Team. Following that team is a separate explicit action.

### Spatial / AR / VR Direction

The Suite metaphor should leave room for a much more immersive future without forcing that technology into the near-term roadmap.

A future Suite could become a persistent spatial room for a fan's team, where friends can join them for games or major moments and interact with live data, stats, media, history, memorabilia, and other team-specific surfaces.

The product language should be able to evolve naturally from:

> **Join David in his Suite.**

to actual shared presence without renaming the concept later.

This is a long-term vision direction, not an MVP commitment.

## Explicitly Not MVP

- Full social network
- Direct messaging
- Fantasy
- Betting
- Ticket marketplace
- Merchandise marketplace
- Complex gamification
- Large AI assistant
- Paid consumer subscription
- Ad platform
- AR / VR / spatial computing

These may become valid later if user evidence and business requirements justify them.

## TeamOS Relationship

Suite should consume normalized domain objects and platform capabilities from TeamOS.

Suite should not know provider-specific schemas, provider IDs, scraping logic, or external API details.

The product test is simple:

> If a second team can use the same Suite without copying the application, the boundary is working.
