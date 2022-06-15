package proxy

import (
	"log"

	"github.com/elazarl/goproxy"
)

// When a client send a CONNECT request to a host, the request is filtered through
// all the HttpsHandlers the proxy has, and if one returns true, the connection is
// sniffed using Man in the Middle attack.
// That is, the proxy will create a TLS connection with the client, another TLS
// connection with the destination the client wished to connect to, and would
// send back and forth all messages from the server to the client and vice versa.
// The request and responses sent in this Man In the Middle channel are filtered
// through the usual flow (request and response filtered through the ReqHandlers
// and RespHandlers)

type AlwaysMitmWrapper struct {
	DebugLogger *log.Logger
}

func (t *AlwaysMitmWrapper) HandleConnect(req string, ctx *goproxy.ProxyCtx) (*goproxy.ConnectAction, string) {
	t.DebugLogger.Printf("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@in handle connect:\n")
	if (ctx.Error != nil) {
		t.DebugLogger.Printf("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ctx:\n", ctx.Error.Error())
	}
	t.DebugLogger.Printf("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@after if:\n")
	// AlwaysMitm
	return goproxy.MitmConnect, req
}
