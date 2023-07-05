import { Configuration, OpenAIApi } from "openai";

export const getOpenAiApi = (apiKey: string) => {
  const configuration = new Configuration({
    apiKey,
  });
  return new OpenAIApi(configuration);
};
