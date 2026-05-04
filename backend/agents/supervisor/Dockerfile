# AgentCore Runtime expects an HTTP server on port 8080 with a `/invocations`
# POST endpoint. The `bedrock_agentcore.runtime.BedrockAgentCoreApp` provides
# that server when you call `app.run()`.
#
# We use a slim Python image (NOT the lambda base) because AgentCore is a
# regular container runtime, not Lambda.
FROM --platform=linux/arm64 python:3.12-slim

WORKDIR /var/task

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY agent.py prompt.py runtime_entrypoint.py ./

ENV PORT=8080
ENV AGENT_NAME=supervisor
EXPOSE 8080

CMD ["python", "runtime_entrypoint.py"]
