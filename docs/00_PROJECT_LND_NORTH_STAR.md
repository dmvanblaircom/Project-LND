# Project LND North Star

## Vision

Project LND (Leave No Doubt) is a sports fan experience platform built around the team, not around a generic sports database.

Existing sports products often make the team a filter inside a larger sports experience. Project LND should make the team the destination.

> Choose your team -> the entire experience becomes that team's destination.

The team becomes the center of the product: identity, schedule, scores, news, media, stats, rankings, history, participation, notifications, and eventually AI-powered context.

## Product Thesis

**Don't build another sports app. Build the platform that turns any sports team into a personalized digital destination.**

Suite helps fans stay connected to their team without having to piece their fandom together across a dozen different places.

The first consumer experience is intentionally free by design. The near-term objective is to earn the fan relationship, learn from real usage, and prove the product before introducing consumer monetization.

> **We don't monetize the fan first. We earn the fan first.**

## Target Fan

The initial target is the passionate college sports fan whose fandom is part of a weekly routine. This fan follows the schedule, checks scores and news, watches games, consumes highlights and commentary, discusses the team, and cares about what happens between games.

This is an initial target, not a permanent market boundary.

## Job To Be Done

> **When I want to stay connected to my team, help me follow what matters without making me piece my fandom together across a dozen different places.**

The product should reduce fragmentation while preserving the depth and personality of team fandom.

## Product Architecture

- **Project LND** = overall product vision
- **TeamOS** = domain intelligence/platform layer
- **Suite** = fan-facing experience
- **Irish Watch** = first team-specific implementation and product laboratory

A useful mental model:

> TeamOS is the brains. Suite is the experience.

TeamOS asks: **What does the platform need to make this possible?**

Suite asks: **What does the fan need?**

## Suite Product Pillars

### Connect

Make the core relationship easy to follow:

- Schedule
- Scores and results
- Standings and rankings
- Roster and players
- News and updates
- Team context

### Experience

Make important moments feel like an experience rather than a collection of data:

- Game Center
- Live updates
- Recaps and previews
- Highlights and media
- Key stats and moments
- Contextual game-day surfaces

### Participate

Give fans lightweight ways to be part of the experience:

- Reactions
- Predictions
- Polls
- Game threads
- Sharing

Community should be introduced carefully. Project LND is not initially a general-purpose social network.

### Belong

Build a persistent relationship between the fan and the team:

- Favorite teams
- Favorite players
- Personalized content
- Notifications
- Team identity throughout the experience

## Year-Round Destination

Suite should not disappear when the game ends. It should support the full fan relationship:

- Game day
- Post-game
- Between games
- Breaking news
- Recruiting where applicable
- Offseason
- Media
- Stats
- History
- Community

The experience can change by context without changing the underlying destination.

## Initial Consumer MVP

The first meaningful Suite experience should concentrate on:

1. Home / Now
2. Schedule
3. Game Center
4. News / Updates
5. Team / Roster
6. Notifications
7. Basic personalization
8. Lightweight participation

The MVP should prove that fans return because the experience is useful, relevant, fast, accurate, and easy to use.

Explicitly not required for the initial MVP:

- Full social network
- Direct messaging
- Fantasy
- Betting - meaning **placing bets from within Suite** (e.g. betting on your team from its destination). Showing odds, spreads, totals and market-implied outlooks as fan context *is* in scope (David, 2026-09-25; decision 0025 treats odds as media metadata).
- Ticket marketplace
- Merchandise marketplace
- Large AI assistant
- Complex gamification
- Paid consumer subscriptions
- Large advertising platform

## AI Direction

AI should be a layer over structured sports data, team content, and user preferences. It should not simply be a generic chatbot bolted onto the product.

Potential experiences include:

- Catch Me Up
- What should I know before the game?
- Five things that matter before kickoff
- Personalized previews
- Recaps
- Historical context
- Team assistant

TeamOS should provide the structured context that makes these experiences useful.

## Initial Wedge

Start with college football. Irish Watch already exists, the sport has strong team identity, and the concept is easy to demonstrate.

Do not attempt every sport at once.

A sensible expansion path is:

1. College Football
2. College Basketball
3. NFL / NBA / MLB / NHL
4. Soccer and other leagues

## North Star Test

The architecture is successful when the same application can produce:

- Notre Dame configuration -> Irish Watch
- Ohio State configuration -> Ohio State Suite
- Bengals configuration -> Bengals Suite
- Cavaliers configuration -> Cavaliers Suite

without copying the application or scattering team-specific conditionals throughout the code.

## Core Principle

**The team should feel like the product, not a filter inside the product.**
