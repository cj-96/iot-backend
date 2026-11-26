Step-by-Step Learning Plan: NestJS + MQTT + Kafka + Redis + MongoDB + WebSockets

Each phase follows the same loop: learn the concept → build a small slice → break it on purpose → move on. Breaking things (killing a consumer, sending duplicates, flooding the broker) is where most of the real learning happens.

Target architecture
Simulator → MQTT Broker → [ingestor] → Kafka (telemetry.raw) → [processor] → MongoDB
                                                    ↓                ↓
                                              [alert-service]     Redis (latest cache, pub/sub)
                                                                     ↓
                                              [api] REST + WebSocket gateway → dashboards
Tech	Its job here
MQTT	Device-facing protocol (lightweight, pub/sub)
Kafka	Durable buffer between ingestion and processing, replayable
Redis	Latest-value cache, rate limiting, dedup keys, WebSocket fan-out
MongoDB	Time-series telemetry plus device/rule documents
WebSockets	Live push to clients
Phase 0: Setup (2-3 days)

Learn: Docker Compose, NestJS modules/providers/DI, monorepo mode (nest generate app).
Build:

docker-compose.yml with EMQX or Mosquitto, Kafka (KRaft mode, no Zookeeper), Redis, MongoDB, and optionally Kafka UI and Mongo Express.
NestJS monorepo with apps ingestor, processor, api, plus a libs/common for shared DTOs and constants.

Done when: all containers run and each Nest app boots with a health endpoint.

Phase 1: MQTT ingestion (1 week)

Learn: topics and wildcards (+, #), QoS 0/1/2, retained messages, Last Will and Testament, clean vs. persistent sessions, topic design (tenant/{id}/device/{id}/telemetry).
Build:

A device simulator script (Node, using mqtt.js) that publishes fake weather readings from N devices every few seconds.
The ingestor app using Nest's MQTT transport (@nestjs/microservices, Transport.MQTT) with @EventPattern('devices/+/telemetry'). Extract deviceId from the topic via the context object.
Basic DTO validation with class-validator.

Break it: disconnect the simulator mid-publish, publish QoS 1 and observe duplicates, send malformed JSON.
Done when: 100 simulated devices publish and the ingestor logs every valid message.

Phase 2: Kafka pipeline (1-1.5 weeks)

Learn: topics, partitions, partition keys (use deviceId so each device's data stays ordered), consumer groups, offsets and commits, at-least-once delivery, retention, replay.
Build:

The ingestor stops processing and only validates minimally and produces to Kafka topic telemetry.raw, keyed by deviceId. It does one job: get data in fast.
The processor app as a Kafka consumer (Nest Kafka transport, which uses kafkajs).

Experiments:

Run 2-3 processor instances in the same group and watch partition rebalancing.
Kill the processor, keep publishing, restart it, and watch it catch up from the stored offset.
Reset offsets to replay history.

Done when: you can explain why Kafka sits between MQTT and the database.

Phase 3: MongoDB storage (1 week)

Learn: time series collections (timeField, metaField, granularity, expireAfterSeconds), compound indexes, aggregation pipeline ($group, $bucket, $dateTrunc), TTL-based retention.
Build:

Mongoose (or the native driver) schemas: telemetry (time series), devices, alert_rules.
Processor logic: validate, sanity-check ranges, normalize units, enrich, then insert in batches (insertMany) instead of one by one.
Idempotency: a unique key like (deviceId, ts, metric) or a message ID so Kafka redeliveries don't create duplicates. Note that time series collections have limited unique-index support, so you may dedupe via Redis (Phase 4) or a separate keyed collection. Researching this tradeoff is a good learning exercise.

Done when: replaying the same Kafka offsets twice doesn't double your data.

Phase 4: Redis (1 week)

Learn: data structures (strings, hashes, sorted sets), TTLs, SET NX EX for dedup, atomic counters, pub/sub vs. Streams.
Build (one use at a time):

Latest-value cache: HSET device:{id}:latest ... updated by the processor, so "current reading" never hits Mongo.
Dedup keys: SET msg:{id} 1 NX EX 3600.
Rate limiting per device (fixed window with INCR + EXPIRE, then try a sliding window).
Last-seen tracking for offline detection.

Done when: the latest-reading query is served from Redis in under 5 ms.

Phase 5: REST API (1 week)

Learn: NestJS controllers, pipes, guards, interceptors, Swagger/OpenAPI, pagination.
Build in the api app:

GET /devices/:id/latest (Redis)
GET /devices/:id/readings?from=&to=&interval=1h&metric=temperature (Mongo aggregation)
Device CRUD
Cache-aside pattern for hot queries

Done when: Swagger docs are live and range queries return downsampled results.

Phase 6: WebSockets live streaming (1 week)

Learn: Nest gateways (@WebSocketGateway), Socket.IO rooms, authentication on handshake, and why you need a Redis adapter (or Redis pub/sub) when running multiple API instances.
Build:

The processor publishes each reading to a Redis channel. The API's gateway subscribes and emits to rooms like device:{id}.
Clients send subscribe with a device ID and receive live updates.
Build a tiny HTML or React page showing a live chart.

Done when: two API instances behind a load balancer both deliver live updates to all clients.

Phase 7: Device identity and security (1 week)

Learn: MQTT auth (username/password, JWT, or mTLS), broker ACLs, credential rotation, JWT for API users.
Build:

Provisioning endpoint that creates a device and issues credentials.
Broker authentication via EMQX's HTTP auth hook or built-in database (Mosquitto needs a dynamic-security plugin).
ACL: a device can only publish to its own topic.
JWT + role guards on the REST/WebSocket side, and tenant scoping if you want multi-tenancy.

Done when: device A cannot publish as device B.

Phase 8: Alerting and offline detection (1 week)

Learn: stream processing basics (stateful rules, windows), debouncing.
Build an alert-service as a separate Kafka consumer group on the same topic (this shows how Kafka lets multiple independent consumers read the same data):

Threshold rules loaded from Mongo and cached in memory.
Absence rules using a Redis last-seen check on a schedule (@nestjs/schedule).
Cooldown and dedup keys so one storm doesn't send 500 alerts.
Notifications via webhook or email, and alert events pushed over WebSocket.
Phase 9: Reliability (1 week)

Learn: retries with backoff, dead-letter topics, poison messages, graceful shutdown, idempotent consumers.
Build:

telemetry.dlq topic for messages that fail validation or processing, with failure reason in headers, plus a small replay script.
Retry topics or in-process retry with backoff.
enableShutdownHooks() so consumers finish in-flight work and commit offsets.
Health checks (@nestjs/terminus) covering Mongo, Redis, and Kafka.
Phase 10: Observability, testing, load (1 week)
Metrics: Prometheus (prom-client) for ingest rate, consumer lag, processing latency, then a Grafana dashboard.
Logging: structured (pino) with a correlation ID passed from MQTT message through Kafka headers into logs.
Tests: unit tests for validators, integration tests with Testcontainers (real Kafka/Mongo/Redis), and e2e from simulator to API.
Load test: scale the simulator to 10k+ devices and find your bottleneck. It's usually the Mongo write path or consumer parallelism, and fixing it teaches a lot.