import { LanguageCode } from '@vendure/common/lib/generated-types';
import { ID } from '@vendure/common/lib/shared-types';
import i18next from 'i18next';

import { DEFAULT_LANGUAGE_CODE } from '../../common/constants';
import { Channel } from '../../entity/channel/channel.entity';
import { AuthenticatedSession } from '../../entity/session/authenticated-session.entity';
import { Session } from '../../entity/session/session.entity';
import { User } from '../../entity/user/user.entity';

import { ApiType } from './get-api-type';

/**
 * @description
 * The RequestContext holds information relevant to the current request, which may be
 * required at various points of the stack.
 *
 * @docsCategory request
 */
export class RequestContext {
    private readonly _languageCode: LanguageCode;
    private readonly _channel: Channel;
    private readonly _session?: Session;
    private readonly _isAuthorized: boolean;
    private readonly _authorizedAsOwnerOnly: boolean;
    private readonly _translationFn: i18next.TFunction;
    private readonly _apiType: ApiType;

    /**
     * @internal
     */
    constructor(options: {
        apiType: ApiType;
        channel: Channel;
        session?: Session;
        languageCode?: LanguageCode;
        isAuthorized: boolean;
        authorizedAsOwnerOnly: boolean;
        translationFn?: i18next.TFunction;
    }) {
        const { apiType, channel, session, languageCode, translationFn } = options;
        this._apiType = apiType;
        this._channel = channel;
        this._session = session;
        this._languageCode =
            languageCode || (channel && channel.defaultLanguageCode) || DEFAULT_LANGUAGE_CODE;
        this._isAuthorized = options.isAuthorized;
        this._authorizedAsOwnerOnly = options.authorizedAsOwnerOnly;
        this._translationFn = translationFn || (((key: string) => key) as any);
    }

    get apiType(): ApiType {
        return this._apiType;
    }

    get channel(): Channel {
        return this._channel;
    }

    get channelId(): ID {
        return this._channel.id;
    }

    get languageCode(): LanguageCode {
        return this._languageCode;
    }

    get session(): Session | undefined {
        return this._session;
    }

    get activeUserId(): ID | undefined {
        const user = this.activeUser;
        if (user) {
            return user.id;
        }
    }

    get activeUser(): User | undefined {
        if (this.session) {
            if (this.isAuthenticatedSession(this.session)) {
                return this.session.user;
            }
        }
    }

    /**
     * @description
     * True if the current session is authorized to access the current resolver method.
     */
    get isAuthorized(): boolean {
        return this._isAuthorized;
    }

    /**
     * @description
     * True if the current anonymous session is only authorized to operate on entities that
     * are owned by the current session.
     */
    get authorizedAsOwnerOnly(): boolean {
        return this._authorizedAsOwnerOnly;
    }

    /**
     * @description
     * Translate the given i18n key
     */
    translate(key: string, variables?: { [k: string]: any }): string {
        try {
            return this._translationFn(key, variables);
        } catch (e) {
            return `Translation format error: ${e.message}). Original key: ${key}`;
        }
    }

    private isAuthenticatedSession(session: Session): session is AuthenticatedSession {
        return session.hasOwnProperty('user');
    }
}
