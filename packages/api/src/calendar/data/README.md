# mycal snapshot — generated, do not edit

Official Malaysian gazette data (JPM BKPP, JAKIM, KPM, MPM) pulled from
[mycal](https://github.com/Junhui20/malaysia-calendar-api), our own MIT calendar
API. `@catlabtech/mycal-core` ships logic and types only, so the data has to be
embedded — and embedding it means Laris never calls mycal at request time.

Refresh when the gazette moves, which is a few times a year:

```bash
pnpm refresh:calendar
```

Adding a year that was not here before also means adding its import to
`../mycal.ts`. That list is explicit so nothing enters the Worker bundle by
accident.
