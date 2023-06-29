package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"github.com/pkg/errors"
	"io"
	"net/http"
	"os"
	"runtime"
	"strings"
)

const aiGatewayBaseURL = "https://hackathon-gateway.c-a.eu-west-1.polaris-prod-bo-dr3d3-1.aws.snyk-internal.net"

func solutionMe(err error) {
	myError := errors.Unwrap(err)
	if myError == nil {
		myError = err
	}

	url := fmt.Sprintf("%s/api/chat", aiGatewayBaseURL)
	httpClient := engine.GetNetworkAccess().GetHttpClient()
	bodyReader, done := getAIGatewayChatRequestBody(err)
	if done {
		return
	}

	req, reqErr := http.NewRequest("POST", url, bodyReader)
	if reqErr != nil {
		engine.GetLogger().Err(reqErr).Send()
		return
	}
	aiToken := getAIGatewayToken()
	req.Header.Add("Authorization", "Bearer "+aiToken)
	req.Header.Add("Content-Type", "application/json")
	resp, respErr := httpClient.Do(req)

	//fmt.Print(string(marshalledBody))

	if respErr != nil {
		engine.GetLogger().Err(respErr).Send()
		return
	}

	result, err3 := io.ReadAll(resp.Body)
	if err3 != nil {
		return
	}
	var air aiResponseMessage
	err = json.Unmarshal(result, &air)
	if err != nil {
		engine.GetLogger().Err(err).Send()
		return
	}

	fmt.Printf("\n\nMaybe this will fix it for you: \n\n%s", air.Message.Content)
	return
}

func getAIGatewayChatRequestBody(err error) (*bytes.Reader, bool) {
	m := message{
		Role:    "USER",
		Content: "How can I fix this?",
	}
	body := aiGateWayBody{
		Provider: "openai",
		Model:    "gpt-4",
		ModelInput: modelInput{
			Context: "I am trying to run snyk " + strings.Join(os.Args[1:], " ") +
				"\nI get the following error: " + err.Error() +
				"\nOperating System:" + runtime.GOOS +
				"\nArchitecture:" + runtime.GOARCH,
			Messages: []message{m},
		},
	}

	marshalledBody, err2 := json.Marshal(body)
	if err2 != nil {
		return nil, true
	}

	bodyReader := bytes.NewReader(marshalledBody)
	return bodyReader, false
}

func getAIGatewayToken() string {
	return os.Getenv("AI_GATEWAY_TOKEN")
}

type aiResponseMessage struct {
	Message struct {
		Content string `json:"content"`
		Role    string `json:"role"`
	} `json:"message"`
}

type modelInput struct {
	Context  string    `json:"context"`
	Messages []message `json:"messages"`
}

type message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}
type aiGateWayBody struct {
	Provider   string     `json:"provider"`
	Model      string     `json:"model"`
	ModelInput modelInput `json:"model_input"`
}
