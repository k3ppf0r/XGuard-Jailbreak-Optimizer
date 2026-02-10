import torch
from modelscope import AutoModelForCausalLM, AutoTokenizer
from typing import List, Dict, Any


class XGuardDetector:
    """XGuard安全检测器,封装YuFeng-XGuard-Reason-0.6B模型"""
    
    _instance = None
    _initialized = False
    
    def __new__(cls):
        """单例模式确保模型只加载一次"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        """初始化模型和tokenizer"""
        if not XGuardDetector._initialized:
            print("Loading XGuard model...")
            self.tokenizer = AutoTokenizer.from_pretrained(
                "Alibaba-AAIG/YuFeng-XGuard-Reason-0.6B"
            )
            self.model = AutoModelForCausalLM.from_pretrained(
                "Alibaba-AAIG/YuFeng-XGuard-Reason-0.6B",
                torch_dtype="auto",
                device_map="auto"
            ).eval()
            XGuardDetector._initialized = True
            print("XGuard model loaded successfully!")
    
    def check_prompt_safety(self, prompt: str, enable_reasoning: bool = False) -> Dict[str, Any]:
        """
        检测用户输入的prompt安全性
        
        Args:
            prompt: 待检测的用户输入
            enable_reasoning: 是否启用reasoning分析(默认False以提升性能)
            
        Returns:
            包含response, token_score, risk_score的字典
        """
        messages = [{'role': 'user', 'content': prompt}]
        max_tokens = 200 if enable_reasoning else 1
        return self._infer(messages, max_new_tokens=max_tokens)
    
    def check_response_safety(self, prompt: str, response: str) -> Dict[str, Any]:
        """
        检测AI响应的安全性
        
        Args:
            prompt: 用户输入
            response: AI响应
            
        Returns:
            包含response, token_score, risk_score的字典
        """
        messages = [
            {'role': 'user', 'content': prompt},
            {'role': 'assistant', 'content': response}
        ]
        return self._infer(messages, max_new_tokens=1)
    
    def analyze_reasoning(self, prompt: str, response: str) -> Dict[str, Any]:
        """
        获取详细的reasoning分析,包含<explanation>标签内容
        
        Args:
            prompt: 用户输入
            response: AI响应
            
        Returns:
            包含response(reasoning文本), token_score, risk_score的字典
        """
        messages = [
            {'role': 'user', 'content': prompt},
            {'role': 'assistant', 'content': response}
        ]
        result = self._infer(messages, max_new_tokens=200)
        
        # 解析<explanation>标签内容
        explanation = ""
        if "<explanation>" in result['response']:
            start_idx = result['response'].find("<explanation>") + len("<explanation>")
            end_idx = result['response'].find("</explanation>")
            if end_idx != -1:
                explanation = result['response'][start_idx:end_idx].strip()
        
        result['explanation'] = explanation
        return result
    
    def _infer(
        self,
        messages: List[Dict[str, str]],
        max_new_tokens: int = 1,
        reason_first: bool = False
    ) -> Dict[str, Any]:
        """
        核心推理函数,复用test-0.6b.py的完整逻辑
        
        Args:
            messages: 对话消息列表
            max_new_tokens: 生成的最大token数
            reason_first: 是否先生成reasoning
            
        Returns:
            包含response, token_score, risk_score的字典
        """
        rendered_query = self.tokenizer.apply_chat_template(
            messages,
            policy=None,
            reason_first=reason_first,
            tokenize=False
        )
        
        model_inputs = self.tokenizer([rendered_query], return_tensors="pt").to(self.model.device)
        
        outputs = self.model.generate(
            **model_inputs,
            max_new_tokens=max_new_tokens,
            do_sample=False,
            output_scores=True,
            return_dict_in_generate=True
        )
        
        batch_idx = 0
        input_length = model_inputs['input_ids'].shape[1]
        
        output_ids = outputs["sequences"].tolist()[batch_idx][input_length:]
        response = self.tokenizer.decode(output_ids, skip_special_tokens=True)
        
        ### parse score ###
        generated_tokens_with_probs = []
        
        generated_tokens = outputs.sequences[:, input_length:]
        
        scores = torch.stack(outputs.scores, 1)
        scores = scores.softmax(-1)
        scores_topk_value, scores_topk_index = scores.topk(k=10, dim=-1)
        
        for generated_token, score_topk_value, score_topk_index in zip(
            generated_tokens, scores_topk_value, scores_topk_index
        ):
            generated_tokens_with_prob = []
            for token, topk_value, topk_index in zip(
                generated_token, score_topk_value, score_topk_index
            ):
                token = int(token.cpu())
                if token == self.tokenizer.pad_token_id:
                    continue
                
                res_topk_score = {}
                for ii, (value, index) in enumerate(zip(topk_value, topk_index)):
                    if ii == 0 or value.cpu().numpy() > 1e-4:
                        text = self.tokenizer.decode(index.cpu().numpy())
                        res_topk_score[text] = {
                            "id": str(int(index.cpu().numpy())),
                            "prob": round(float(value.cpu().numpy()), 4),
                        }
                
                generated_tokens_with_prob.append(res_topk_score)
            
            generated_tokens_with_probs.append(generated_tokens_with_prob)
        
        score_idx = max(len(generated_tokens_with_probs[batch_idx])-2, 0) if reason_first else 0
        id2risk = self.tokenizer.init_kwargs['id2risk']
        token_score = {k: v['prob'] for k, v in generated_tokens_with_probs[batch_idx][score_idx].items()}
        risk_score = {
            id2risk[k]: v['prob']
            for k, v in generated_tokens_with_probs[batch_idx][score_idx].items()
            if k in id2risk
        }
        
        result = {
            'response': response,
            'token_score': token_score,
            'risk_score': risk_score,
        }
        
        return result
