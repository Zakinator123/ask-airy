import {RequestWithTokensToBeRateLimited} from "../types/CoreTypes";

export class RequestAndTokenRateLimiter {
    private readonly _maxRequests;
    private readonly _maxTokens;
    private readonly _maxRequestsAndTokensInterval;

    private fnQueue: Array<RequestWithTokensToBeRateLimited<unknown>> = [];
    private queueScheduledToClear: boolean = false;

    constructor(maxRequests: number, maxRequestsInterval: number, maxTokens: number) {
        this._maxRequests = maxRequests;
        this._maxRequestsAndTokensInterval = maxRequestsInterval;
        this._maxTokens = maxTokens;
    }

    private executeLimitedNumberOfRequestsInQueue = () => {
        const queueLength = this.fnQueue.length;
        if (queueLength !== 0) {
            let numTokensInFlight = 0;
            for (let i = 0; i < Math.min(queueLength, this._maxRequests); i++) {
                const request = this.fnQueue[0]!;
                if (numTokensInFlight + request.numTokensInRequest > this._maxTokens) break;
                this.fnQueue.shift()!.request();
            }
            setTimeout(this.executeLimitedNumberOfRequestsInQueue, this._maxRequestsAndTokensInterval);
        } else this.queueScheduledToClear = false;
    }

    returnRateAndTokenLimitedPromise = <T>(aiServiceRequestToBeRateLimited: RequestWithTokensToBeRateLimited<T>): Promise<T> => {
        if (!this.queueScheduledToClear) {
            this.queueScheduledToClear = true;
            setTimeout(this.executeLimitedNumberOfRequestsInQueue, 0);
        }

        return new Promise((resolve, reject) => {
            this.fnQueue.push(
                {
                    request: () => aiServiceRequestToBeRateLimited.request().then(resolve).catch(reject),
                    numTokensInRequest: aiServiceRequestToBeRateLimited.numTokensInRequest
                });
        });
    }
}