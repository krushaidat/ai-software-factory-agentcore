# AgentCore Runtime expects an HTTP server on port 8080 with /invocations.
# bedrock-agentcore SDK provides BedrockAgentCoreApp which serves that HTTP
# layer when you call app.run() (see runtime_entrypoint.py).
#
# IMPORTANT: AgentCore Runtime only accepts arm64 images.
FROM --platform=$TARGETPLATFORM python:3.12-slim

WORKDIR /var/task

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Flat layout (no Python package), so agent.py uses absolute imports of prompt.
COPY agent.py prompt.py runtime_entrypoint.py ./

ENV PORT=8080
EXPOSE 8080

CMD ["python", "runtime_entrypoint.py"]
