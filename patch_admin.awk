BEGIN { in_block = 0 }
/^\s*const currentHeroStats = JSON\.parse/ {
    print "      const currentHeroStats = JSON.parse(JSON.stringify(gameState?.heroStats || window.heroStatsList || []));"
    print "      currentHeroStats.sort((a, b) => (b.totalDamage || b.score || 0) - (a.totalDamage || a.score || 0));"
    print "      const currentGuilds = JSON.parse(JSON.stringify(gameState?.guilds || []));"
    print "      currentGuilds.sort((a, b) => (b.totalDamage || b.score || 0) - (a.totalDamage || a.score || 0));"
    in_block = 1
    next
}
/^\s*const currentGuilds = JSON\.parse/ {
    if (in_block) next
}
{ print $0 }
