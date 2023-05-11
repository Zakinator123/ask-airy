import {RequestWithTokensToBeRateLimited} from "../types/CoreTypes";

export class RequestAndTokenRateLimiter {
    private readonly _maxRequests;
    private readonly _maxTokens;
    private readonly _maxRequestsAndTokensInterval;
    private readonly _maxRequestsInFlight = 20;

    private fnQueue: Array<RequestWithTokensToBeRateLimited<unknown>> = [];

    private requestsBucket: number;
    private tokensBucket: number;

    private bucketScheduledToEmpty: boolean;

    constructor(maxRequests: number, maxRequestsInterval: number, maxTokens: number) {
        this._maxRequests = maxRequests;
        this._maxRequestsAndTokensInterval = maxRequestsInterval;
        this._maxTokens = maxTokens;
        this.requestsBucket = 0;
        this.tokensBucket = 0;
        this.bucketScheduledToEmpty = false;
    }

    private executeRateLimitedRequestsInQueue = async () => {
        if (this.fnQueue.length !== 0 && !this.bucketScheduledToEmpty) {
            setTimeout(() => {
                this.requestsBucket = 0;
                this.tokensBucket = 0;
                this.bucketScheduledToEmpty = false;
                this.executeRateLimitedRequestsInQueue();
            }, this._maxRequestsAndTokensInterval);
        }

        let concurrentRequestsInFlight = []
        while (this.fnQueue.length !== 0) {
            const request = this.fnQueue[0]!;

            if (this.tokensBucket + request.numTokensInRequest > this._maxTokens) break;
            if (this.requestsBucket + 1 > this._maxRequests) break;

            if (concurrentRequestsInFlight.length >= this._maxRequestsInFlight) {
                await Promise.all(concurrentRequestsInFlight);
                concurrentRequestsInFlight = [];
            }
            this.tokensBucket += request.numTokensInRequest;
            this.requestsBucket += 1;

            console.log(this.requestsBucket);
            console.log(this.tokensBucket);

            concurrentRequestsInFlight.push(this.fnQueue.shift()!.request());
        }
    }

    returnRateAndTokenLimitedPromise = <T>(aiServiceRequestToBeRateLimited: RequestWithTokensToBeRateLimited<T>): Promise<T> => {
        if (this.fnQueue.length === 0) {
            setTimeout(this.executeRateLimitedRequestsInQueue, 0);
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