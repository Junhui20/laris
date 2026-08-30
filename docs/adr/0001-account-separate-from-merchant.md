# Account is separate from Merchant

A Merchant is one location — one Google Business Profile card, one address, and critically **one Malaysian state**, which fixes its public holidays and its weekend group. Multi-property owners are common in `stay` (a homestay in Penang and another in Cameron Highlands is an ordinary situation), and a single Profile cannot hold two states without one of them being wrong. So billing, brand, tone and WhatsApp identity live on an **Account**, which owns one or more Merchants.

For a single-location business the Account is invisible — one Account, one Merchant. We are paying a one-line cost now to avoid a data migration later, on the strength of a scenario that is normal rather than hypothetical in our first vertical.

## Considered options

- **Merchant only, no Account.** Rejected: two properties would mean two Merchants, and the owner would re-enter brand and tone twice, get two disconnected sites competing for the same search intent, and reasonably object to being billed twice.
- **One Merchant holding multiple locations.** Rejected: the state field is the breaking point. Holidays and the weekend itself vary by state, so a Profile spanning two states produces wrong scheduling and wrong weekend pricing for at least one of them. That is a correctness failure, not a preference.
