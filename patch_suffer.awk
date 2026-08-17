/const isZone2/ {
    print "      let suffer = 0;"
    print "      if (avgHr > 0) suffer = Math.pow(avgHr / 150.0, 2) * duration;"
    print $0
    next
}
/isExcluded: isExcluded,/ {
    print $0
    print "        suffer: suffer,"
    next
}
{ print $0 }
