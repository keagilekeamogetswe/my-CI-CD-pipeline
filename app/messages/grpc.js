import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import { Messages } from './service.msg.js';

// Load proto definition
const packageDef = protoLoader.loadSync('./../proto/messages.proto', {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

// Access the package
const proto = grpc.loadPackageDefinition(packageDef).messages;



const server = new grpc.Server();
server.addService(proto.MessageService.service, {
  SendMessage: Messages.sendMessage,
  GetMessages: Messages.getMessages
});

server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), () => {
  console.log("MessageService running on port 50051");
  server.start();
});
