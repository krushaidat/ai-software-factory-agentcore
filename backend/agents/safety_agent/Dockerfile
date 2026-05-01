FROM public.ecr.aws/lambda/python:3.12

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY agent.py prompt.py ./

ENV PORT=8080
ENV AGENT_NAME=safety_agent
EXPOSE 8080

CMD ["python", "-m", "strands.tools.agentcore_runtime", "agent:main"]
