# Approved type and navigation rollout

David approved proceeding October 5 after reviewing the Home/Game/News reference. His October 4 correction supersedes the earlier Instrument Serif decision: use Instrument Sans for the main interface and retain Georgia for News headings and article headlines until another editorial face is chosen. Ohio State Team Style retains Nunito Sans. Preserve the unified SUITE/team header and compact depth-chart changes with movement arrows.

The implementation self-hosts Instrument Sans with a native 80%-width display instance. Pearl pages surround white cards; Suite Style uses Ink actions, Champagne on dark surfaces, and a small Bronze header separator. The neutral secondary accent is lighter than the early preview's Slate value so it passes the existing identity contrast gate on dark surfaces. Team colors remain unchanged.

Page titles share a quieter 2.15rem size and consistent spacing. Desktop header contents align with the main column. Roster unit tabs keep their sticky behavior with a subtler separator; bottom-navigation icons and labels have more breathing room. Enlarged text can wrap the team name and stack Matchup labels above the two values. The Game location label is white for contrast over artwork.

Suite's first-paint tokens match its current identity even when a browser has the retired cobalt palette stored. Legacy Barlow stacks migrate before first paint. Existing worker, gesture, route, font-isolation and boot tests remain; the two compressed fonts are precached for offline use.

Validation is recorded in the pull request. The reviewed references use captured fixture data, not current sports results. Phone-width browser checks are not a physical iPhone/Safari certification.
