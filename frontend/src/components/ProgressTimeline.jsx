import { Timeline, Tag, Collapse, Progress } from 'antd';

export default function ProgressTimeline({ data }) {
  if (!data || data.length === 0) {
    return <div style={{ textAlign: 'center', color: '#999' }}>暂无进度数据</div>;
  }

  return (
    <Timeline>
      {data.map((item, index) => {
        const promptSafe = item.prompt_safe_score || 0;
        const responseSafe = item.response_safe_score || 0;
        const score = item.score || 0;

        return (
          <Timeline.Item key={index} color={item.skipped ? 'gray' : score > 0.7 ? 'green' : score > 0.4 ? 'orange' : 'red'}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8 }}>
                <strong>迭代 {item.iteration + 1} - 候选 {item.candidate_index + 1}</strong>
                {item.skipped ? (
                  <Tag color="default" style={{ marginLeft: 8 }}>跳过: {item.skipped}</Tag>
                ) : (
                  <Tag color={score > 0.7 ? 'green' : score > 0.4 ? 'orange' : 'red'} style={{ marginLeft: 8 }}>
                    综合得分: {(score * 100).toFixed(2)}%
                  </Tag>
                )}
              </div>

              {item.skipped ? (
                <pre style={{
                  background: '#f5f5f5', padding: 8, borderRadius: 4,
                  fontSize: '12px', maxHeight: '60px', overflow: 'auto',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: '#999'
                }}>{item.candidate}</pre>
              ) : (
                <>
              <div style={{ marginBottom: 12 }}>
                <Tag color={promptSafe > 0.5 ? 'green' : 'red'}>
                  Prompt通过检测: {(promptSafe * 100).toFixed(2)}%
                </Tag>
                {/* 仅当有response数据时显示 */}
                {item.llm_response && (
                  <Tag color={responseSafe < 0.5 ? 'green' : 'orange'}>
                    Response危险性: {((1 - responseSafe) * 100).toFixed(2)}%
                  </Tag>
                )}
              </div>

              <div style={{ marginBottom: 12 }}>
                <p style={{ margin: '4px 0', color: '#666' }}>
                  <strong>越狱提示词:</strong>
                </p>
                <pre
                  style={{
                    background: '#f5f5f5',
                    padding: 8,
                    borderRadius: 4,
                    fontSize: '12px',
                    maxHeight: '100px',
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                  }}
                >
                  {item.candidate}
                </pre>
              </div>

              <div style={{ marginBottom: 8 }}>
                <Progress
                  percent={score * 100}
                  strokeColor={score > 0.7 ? '#52c41a' : score > 0.4 ? '#faad14' : '#ff4d4f'}
                  size="small"
                />
              </div>

              <Collapse
                ghost
                items={[
                  // 仅当有LLM响应时显示LLM响应项
                  ...(item.llm_response ? [{
                    key: 'llm-response',
                    label: 'LLM响应',
                    children: (
                      <pre
                        style={{
                          background: '#fafafa',
                          padding: 8,
                          borderRadius: 4,
                          fontSize: '12px',
                          maxHeight: '150px',
                          overflow: 'auto',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-all',
                        }}
                      >
                        {item.llm_response}
                      </pre>
                    ),
                  }] : []),
                  {
                    key: 'reasoning',
                    label: 'Reasoning分析',
                    children: (
                      <div>
                        {item.reasoning?.explanation ? (
                          <pre
                            style={{
                              background: '#fafafa',
                              padding: 8,
                              borderRadius: 4,
                              fontSize: '12px',
                              maxHeight: '200px',
                              overflow: 'auto',
                              whiteSpace: 'pre-wrap',
                            }}
                          >
                            {item.reasoning.explanation}
                          </pre>
                        ) : (
                          <p style={{ color: '#999' }}>无详细分析</p>
                        )}
                      </div>
                    ),
                  },
                  {
                    key: 'risk-details',
                    label: '风险详情',
                    children: (
                      <div>
                        <p>
                          <strong>Prompt风险分数:</strong>
                        </p>
                        {item.prompt_safety?.risk_score &&
                          Object.entries(item.prompt_safety.risk_score).map(([key, value]) => (
                            <div key={key}>
                              {key}: <Tag>{(value * 100).toFixed(2)}%</Tag>
                            </div>
                          ))}
                        {/* 仅当有response数据时显示Response风险分数 */}
                        {item.llm_response && item.response_safety?.risk_score && Object.keys(item.response_safety.risk_score).length > 0 && (
                          <>
                            <p style={{ marginTop: 12 }}>
                              <strong>Response风险分数:</strong>
                            </p>
                            {Object.entries(item.response_safety.risk_score).map(([key, value]) => (
                              <div key={key}>
                                {key}: <Tag>{(value * 100).toFixed(2)}%</Tag>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    ),
                  },
                ]}
              />
                </>
              )}
            </div>
          </Timeline.Item>
        );
      })}
    </Timeline>
  );
}
