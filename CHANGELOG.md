# Changelog

## 1.2.0

Convergence release. Lands the accumulated 1.x work on a single line that all
consumers can adopt, and softens the remaining rough edges from the v0 → v1
split so legacy consumers can upgrade with a version bump plus a handful of
import rewrites.

### Migration for v0.6.x consumers

No runtime code changes are required. To adopt 1.2.0:

1. Bump `@nominal-systems/dmi-engine-common` to `^1.2.0` in `package.json` and
   reinstall.
2. If your code uses the deep import path
   `@nominal-systems/dmi-engine-common/lib/interfaces/*` or `/lib/constants`,
   rewrite it to the root import — every one of those symbols is re-exported
   from `@nominal-systems/dmi-engine-common`.
3. If you have a class that did `implements ProviderIntegration` under v0.x,
   either swap to the new compat alias `ProviderIntegrationV0` (one-line
   change) or split the clause into the individual v1 interfaces
   (`ProviderIntegration`, `ProviderServices`, `ProviderReferenceData`,
   `ProviderOrderCreation`, `ProviderOrderUpdate`, `ProviderIntegrationAdmin`,
   `ProviderApi`).

### Added

- `ProviderIntegrationV0` compat type alias (deprecated, for v0 → v1
  transition only). Equivalent to the pre-split monolithic
  `ProviderIntegration` interface.
- `CHANGELOG.md` (this file).

### Changed

- `ProviderIntegrationAdmin.handleNewIntegration`,
  `handleIntegrationDelete`, and `handleIntegrationUpdate` now accept
  `context?: MqttContext` (was required). Matches the rest of the interface
  and restores compatibility with v0 call sites.
- `ProviderService<T>.acknowledgeOrder`, `acknowledgeOrders`,
  `acknowledgeResult`, and `acknowledgeResults` are now optional. Providers
  that do not implement an acknowledgement flow no longer need to declare
  them. `BaseProviderService<T>` still requires the singular forms as
  abstract and provides default loop implementations of the plural forms, so
  subclasses of the base keep the strict contract.

### Carried over from 1.1.x

For consumers migrating from 0.6.x, these 1.x additions are also available
(no action required):

- New `BaseProviderService<T>` abstract class and `BaseApiService` helper.
- `OrderPatient.weight` (`{ measurement, units }`) alongside the existing
  `weightMeasurement` / `weightUnits`.
- `ClientPayload.contact` (`{ phone?, email? }`).
- `VeterinarianPayload.identifier?: Identifier[]`.
- `PimsIdentifiers.VeterinarianID`.
- `TestResultItemInterpretationCode.POSITIVE`.
- `IdsPayload` batch ID interface.
- `isNumber()` and `mergePicks()` utilities.
- `AxiosInterceptor` now serializes query-parameter information when logging
  request/response URLs.
- `ProviderService<T>.testAuth()`.
- `ProviderRawData.accessionIds` and
  `AxiosInterceptor.extractAccessionIds()`.
