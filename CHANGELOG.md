# Changelog

## Unreleased

### Fixed

- `AxiosInterceptor` no longer replaces a failed request's error with
  `TypeError: Cannot read properties of undefined (reading 'data')` when the
  request got no response (a timeout, a reset or refused connection, a DNS
  failure). The caller now receives the original axios error, with its `code`
  ([#29](https://github.com/nominal-systems/dmi-engine-common/issues/29)).
- Recording a call can no longer change its outcome. Whatever `filter()`,
  `debug()`, `extractAccessionIds()` or a `handleResponse()` override throws,
  on success or on failure, is logged at warn and the response or the original
  error is passed on. An `extractAccessionIds()` that cannot read a body (an
  error body, typically) no longer costs the record: it is emitted with
  `accessionIds: []`.

### Added

- A request that got no response is logged at error level
  (`<METHOD> <url> -> <code>: <message>`) and emitted as a `raw_data` record
  with `status: 0` and the error `code`. That record carries no request
  headers and no request body. It goes through `handleNoResponse()`, which an
  engine can override; the response hooks are not called for it. A request
  the caller cancelled is logged at debug level and not recorded.
- A failed request that did get a response is logged with the same
  `<METHOD> <url> -> <status>` debug line as a successful one (still gated by
  `debug()`), or at error level when its body never arrived.
- `ProviderRawData.code`. `headers` and `body` are now optional: a record for
  a request with no response has neither.
- Request duration
  ([#30](https://github.com/nominal-systems/dmi-engine-common/issues/30)).
  `AxiosInterceptor.onModuleInit()` also registers a request interceptor that
  stamps `config.metadata.startTime` (a copy of the caller's `metadata`, so
  `integrationId` is kept). Every log line above ends its `-> ...` part with
  the elapsed time, e.g. `GET <url> -> 200 (1423ms)`, and every `raw_data`
  record carries `duration` in milliseconds. An engine that registers its own
  axios interceptors instead of calling `onModuleInit()` gets no duration;
  nothing else changes for it.
- `ProviderRawData.duration`.

## 1.3.0

Adds integration context propagation so `raw_data` events (persisted as
`external_requests` by dmi-api) can be traced back to the integration that
originated each HTTP request. See
[dmi-api#302](https://github.com/nominal-systems/dmi-api/issues/302).

### Added

- `RequestContext` AsyncLocalStorage-based request context:
  `runWithRequestContext(context, fn)` and `getRequestContext()`.
- `IntegrationContextInterceptor`: NestJS interceptor that extracts
  `integrationId` from incoming MQTT messages (`data.integrationId` or
  `data.payload.integrationId`) and runs the handler inside the request
  context. Register it as an `APP_INTERCEPTOR` in provider modules.
- `ProviderRawData.integrationId` and `IMetadata.integrationId` (both
  optional).
- `AxiosInterceptor` now emits `integrationId` in `raw_data` events, resolved
  from the per-request axios config (`config.metadata.integrationId`,
  explicit override) or the ambient request context (set at the MQTT handler
  or Bull processor entry point via `IntegrationContextInterceptor` /
  `runWithRequestContext()`).

All new fields are optional: consumers on 1.2.0 behavior are unaffected.

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
