# AI Software Factory — AgentCore Edition

**A multi-agent automotive software factory demo on Amazon Bedrock AgentCore.**

Built by Storm Reply × AWS as a flagship internal demo for the AgentCore platform. The demo analyzes real Autoware automotive C++ code with 7 specialist AI agents collaborating in real time.

---

## 🎬 Live Demo

**🔗 https://d2hn2ssjo95ly3.cloudfront.net**

Login with your Cognito credentials. The Mission Control workspace shows:

- **Pipeline** — animated stage execution with live timing
- **Agents** — force-directed graph of 7 agents exchanging A2A messages
- **Reasoning** — collapsible live tree of agent thoughts, tool calls, decisions
- **Memory** — cross-session timeline of what agents learned (Memory Replay)
- **Code Interpreter** — live Python execution from agents (MISRA scans, complexity, SAST)
- **Reports** — compliance, fleet, Jira, knowledge graph, ROI

---

## 🤖 What's Actually AgentCore

This demo uses **all 6 GA AgentCore primitives**:

| Primitive | Where it shows |
|---|---|
| **Runtime** | 7 specialist agents (supervisor + quality/safety/security/test/deployment/integration) deployed as containers in AgentCore Runtime |
| **Memory** | 4 strategies (SHORT_TERM, USER_PREFERENCE, SEMANTIC, SUMMARY) — visible in the Memory Replay tab |
| **Gateway** | 7 Lambda tools (misra_checker, cve_lookup, fleet_query, jira_create, dtc_register, knowledge_graph_query, coverage_query) registered as MCP tools |
| **Identity** | Cognito JWT → workload identity, agents act on behalf of authenticated user |
| **Browser** | SecurityAgent fetches live CVE data from NVD via managed headless browser |
| **Code Interpreter** | Quality/Safety/Security agents run real Python analysis on the source code |
| **Observability** | OTel traces stream from agents → trace-streamer Lambda → WebSocket → Reasoning Trace UI |

The frontend listens to a CONTRACTS-defined event stream that any AgentCore-instrumented backend can drive.

---

## 🏗️ Architecture

```
Frontend (React + Vite) ──── CloudFront ──── S3
   │
   │ wss:// (Cognito JWT)
   │
   ▼
WebSocket API Gateway ──── Lambda (router) ──── Lambda (agentcore-bridge)
                                                       │
                                                       │ InvokeAgentRuntime
                                                       ▼
                                              ┌─────────────────────┐
                                              │  Supervisor Agent    │ ─── A2A ───┐
                                              │  (Strands SDK,       │            │
                                              │   AgentCore Runtime) │            │
                                              └─────────┬───────────┘            │
                                                        │                          │
                          ┌─────────┬─────────┬─────────┼─────────┬─────────┬───────┐
                          ▼         ▼         ▼         ▼         ▼         ▼       │
                       Quality   Safety   Security   Test  Deployment Integration  │
                                                                                    │
                          (each agent emits OTel events to AgentCore Observability) │
                                                                                    │
                                              EventBridge ───── trace-streamer ─────┘
                                                                       │
                                                                       ▼
                                                                  WebSocket → Frontend
```

---

## 📂 Repo Structure

```
ai-software-factory/
├── src/                              # React frontend
│   ├── workspace/                    # Mission Control shell + center views
│   │   ├── WorkspaceShell.tsx        # 4-rail layout (top, left, center, right, bottom)
│   │   ├── TopBar.tsx, LeftRail.tsx, RightRail.tsx, BottomTicker.tsx
│   │   └── center/                   # Tab views
│   │       ├── ReasoningTraceView.tsx     # 🔥 Live reasoning tree
│   │       ├── AgentNetworkView.tsx       # 🔥 Force-directed agent graph
│   │       ├── CodeInterpreterView.tsx    # 🔥 Live Python execution
│   │       ├── MemoryReplayView.tsx       # 🔥 Cross-session memory timeline
│   │       ├── PipelineView.tsx, ReportsView.tsx
│   ├── components/agents/            # Reusable agent UI primitives
│   ├── design/                       # tokens, GlassCard, Lucide icons
│   ├── hooks/                        # useAgentStream, useAgentNetwork, etc
│   ├── services/agentcore-events.ts  # WS event parsing → reasoning tree
│   ├── data/sampleTrace.ts           # Offline-mode demo data
│   └── ...
│
├── backend/
│   ├── agents/                       # 7 Strands agents (Python + Dockerfile)
│   │   ├── CONTRACTS.md              # Event schema (source of truth)
│   │   ├── supervisor/, quality_agent/, safety_agent/, security_agent/,
│   │   ├── test_agent/, deployment_agent/, integration_agent/
│   ├── tools/                        # 7 Lambda tools for AgentCore Gateway
│   ├── functions/                    # Bridge, trace-streamer, copilot, etc
│   ├── agentcore/                    # AgentCore CFN stack (Memory, Gateway, Runtime, Identity)
│   │   ├── template.yaml             # Memory + Gateway + 7 Runtimes + tool Lambdas
│   │   ├── cost-alarms.yaml          # AWS Budget + CloudWatch alarms
│   │   ├── seed-data/                # fleet.json, knowledge_graph.json + seed.py
│   │   ├── build-and-push.sh         # Build & push 7 agent Docker images
│   │   └── deploy.sh                 # Full deploy orchestration
│   ├── demo_corpus/autoware/         # 11 real Autoware C++ files (Apache-2.0)
│   ├── layers/common/                # Shared utilities (boto3 helpers)
│   └── template.yaml                 # Main stack (WS API, HTTP API, DDB, Cognito)
│
├── infra/                            # Frontend hosting (S3 + CloudFront)
└── .github/workflows/deploy.yml      # OIDC-based CI/CD
```

---

## 🚀 Quick Start

### Local development

```bash
npm install
npm run dev    # → http://localhost:5173
```

The app works **fully offline** with sample data — no backend required for development.

### Production build

```bash
npm run build
```

### Deploy frontend

```bash
bash infra/deploy.sh
```

### Deploy backend (main stack)

```bash
cd backend
sam build
sam deploy --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
  --parameter-overrides AdminEmail=you@example.com
```

### Deploy AgentCore stack

```bash
cd backend/agentcore
bash build-and-push.sh         # Builds & pushes 7 agent Docker images
bash deploy.sh                 # Deploys CFN with image URIs + seeds DDB
```

> ⚠️ AgentCore CFN resources (`AWS::BedrockAgentCore::Memory`, `Gateway`, `Runtime`, `WorkloadIdentity`) hit GA in October 2025. Some property names may need adjustment against the latest docs — see `# TODO: verify against latest CFN docs` comments in the template.

---

## 🎓 Demo Code Corpus

11 hand-picked C++ files from [Autoware Universe](https://github.com/autowarefoundation/autoware_universe) (Apache-2.0):

| File | Module | ASIL | LOC |
|---|---|---|---|
| `autonomous_emergency_braking.cpp` | control | D | ~46 KB |
| `pid_longitudinal_controller.cpp` | control | C | ~53 KB |
| `mpc_lateral_controller.cpp` | control | C | ~29 KB |
| `raw_vehicle_cmd_converter.cpp` | vehicle | C | ~15 KB |
| `imu_corrector.cpp` | sensing | B | ~8 KB |
| `image_diagnostics.cpp` | sensing | B | ~14 KB |
| `calibration_status_classifier.cpp` | sensing | B | ~22 KB |
| `radar_scan_to_pointcloud2.cpp` | sensing | A | ~6 KB |
| `mission_planner.cpp` | planning | B | ~32 KB |
| `external_velocity_limit_selector.cpp` | planning | C | ~9 KB |
| `bluetooth_monitor.cpp` | system | QM | ~6 KB |

See `backend/demo_corpus/autoware/MANIFEST.json` for full metadata and `THIRD_PARTY_NOTICES.md` for license attribution.

---

## 💰 Cost Profile

| Scenario | Cost |
|---|---|
| Idle (frontend hosting + auth + tables) | ~$3–4/month |
| Single demo run (one PR through 7 agents) | ~$0.50 |
| Sales meeting (5–10 demo runs) | ~$3–5 |
| Heavy month (~500 runs) | ~$250 |
| Worst-case ceiling (rate-limit-hit) | ~$15-20/hour |

Protected by:
- AgentCore Runtime reserved concurrency = 2 per agent
- Lambda concurrency caps
- Per-session rate limits (10 questions/hour, 1/10 sec)
- AWS Budget alarm at $50/month → email
- CloudWatch alarms on Bedrock token spend

---

## 🛠 Tech stack

**Frontend:** React 18 · TypeScript · Vite · Tailwind CSS · Framer Motion · Recharts · React Router · amazon-cognito-identity-js · lucide-react

**Backend:** Python 3.12 · Strands Agents SDK · boto3 · Bedrock (Claude 3.5 Sonnet) · DynamoDB · Lambda · API Gateway (WebSocket + HTTP) · Cognito · ECR · Step Functions (legacy) · EventBridge

**AgentCore:** Runtime · Memory · Gateway · Identity · Browser · Code Interpreter · Observability

---

## 📝 License

This demo's source code is for internal demonstration. Autoware code in `backend/demo_corpus/autoware/` is licensed Apache-2.0 — see `THIRD_PARTY_NOTICES.md`.
