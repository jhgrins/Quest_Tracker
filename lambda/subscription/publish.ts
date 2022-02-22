import { SNSEvent, APIGatewayProxyResult } from "aws-lambda";
import { Socket } from "../../types";

import { getItemFromDynamoDBResult, getItemsByIndex } from "../db";
import { SubscriptionMessage } from "../sns";
import { sendMessageToSocket, HTTP_SUCCESS, HTTP_SERVER_ERROR } from "./utils";

const publish = async (event: SNSEvent): Promise<APIGatewayProxyResult> => {
	const { message, filters }: SubscriptionMessage = JSON.parse(event.Records[0].Sns.Message);

	const queryOutput = await getItemsByIndex("sockets", "subscription", filters.subscription);
	if (queryOutput.Count === 0 || !queryOutput.Items) {
		return { statusCode: HTTP_SUCCESS, body: "" };
	}

	let sockets = queryOutput.Items as unknown as Socket[];
	if (filters.userId) {
		sockets = sockets.filter((item) => item.userId === filters.userId);
	}

	for (const socket of sockets) {
		await sendMessageToSocket(socket.callbackUrlForAWS, socket.connectionId, {
			id: socket.operationId,
			payload: { data: { [socket.subscription]: message } },
			type: "next"
		});
	}
	return { statusCode: HTTP_SUCCESS, body: "" };
};

module.exports.publish = publish;