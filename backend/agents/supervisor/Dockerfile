FROM public.ecr.aws/lambda/python:3.12

# AgentCore Runtime contract: HTTP POST /invocations on port 8080.
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY agent.py prompt.py ./

ENV PORT=8080
ENV AGENT_NAME=supervisor
EXPOSE 8080

# Strands provides an AgentCore Runtime adapter that wraps `main(payload)`
# in the required HTTP server with /invocations and /ping endpoints.
CMD ["python", "-m", "strands.tools.agentcore_runtime", "agent:main"]
