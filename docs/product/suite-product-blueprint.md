# Suite Product Blueprint

**Status:** DECISION + OPEN QUESTIONS

Suite is the fan-facing experience layer. It should feel like the digital home of the fan's relationship with a team, not like athletic-department software and not like a generic sports database.

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

- Favorite team
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

Priority: recruiting, transactions, roster changes, schedule changes, analysis, history.

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

These may become valid later if user evidence and business requirements justify them.

## TeamOS Relationship

Suite should consume normalized domain objects and platform capabilities from TeamOS.

Suite should not know provider-specific schemas, provider IDs, scraping logic, or external API details.

The product test is simple:

> If a second team can use the same Suite without copying the application, the boundary is working.
