# Copyright (c) 2021-2024 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# Contributors:
#   Red Hat, Inc. - initial API and implementation

FROM docker.io/node:18.19.1-alpine3.19 as builder
ARG SL_TOKEN=''
ENV SL_TOKEN=$SL_TOKEN

# hadolint ignore=DL3018
RUN apk add --no-cache python3 make g++

# hadolint ignore=DL3059,SC1072
RUN if ! [ type "yarn" &> /dev/null ]; then \
        apk add yarn --no-cache; \
    fi

COPY package.json /dashboard/
COPY yarn.lock /dashboard/
COPY lerna.json /dashboard/
COPY tsconfig.json /dashboard/

ENV COMMON=packages/common
COPY ${COMMON}/package.json /dashboard/${COMMON}/

ENV FRONTEND=packages/dashboard-frontend
COPY ${FRONTEND}/package.json /dashboard/${FRONTEND}/

ENV BACKEND=packages/dashboard-backend
COPY ${BACKEND}/package.json /dashboard/${BACKEND}/

WORKDIR /dashboard
RUN yarn install --network-timeout 3600000
COPY packages/ /dashboard/packages
RUN yarn build:dev

#perform sealights scanning

RUN yarn add slnodejs -W
RUN yarn slnodejs config --token ${SL_TOKEN} --appname "che-dashboard" --branch "main" --build "7.89.0-next.0"

ENV NODE_DEBUG=sl
RUN yarn slnodejs scan --token ${SL_TOKEN} --buildsessionidfile buildSessionId --instrumentForBrowsers --workspacepath /dashboard/${FRONTEND}/lib/public --outputpath /dashboard/${FRONTEND}/lib/sl_public --scm none --uniqueModuleId frontend-package
RUN yarn slnodejs scan --token ${SL_TOKEN} --buildsessionidfile buildSessionId --workspacepath /dashboard/${BACKEND}/lib  --scm none --uniqueModuleId backend-package
RUN yarn slnodejs scan --token ${SL_TOKEN} --buildsessionidfile buildSessionId --workspacepath /dashboard/${COMMON}/   --scm none --uniqueModuleId common-package
RUN yarn slnodejs buildend --token ${SL_TOKEN} --buildsessionidfile buildSessionId --ok

# RUN yarn slnodejs dryRun --verbose --instrumentForBrowsers --workspacepath /dashboard/${FRONTEND}/lib/public --scm none
# RUN mv sl-dry-run-output sl-dryrun-frontend
# RUN yarn slnodejs dryRun --verbose --instrumentForBrowsers --workspacepath /dashboard/${BACKEND}/lib --scm none
# RUN mv sl-dry-run-output sl-dryrun-backend
# RUN yarn slnodejs dryRun --verbose --instrumentForBrowsers --workspacepath dashboard/${COMMON}/ --scm none
# RUN mv sl-dry-run-output sl-dryrun-common


# leave only production dependencies
RUN yarn workspace @eclipse-che/dashboard-backend install --production

FROM docker.io/node:18.19.1-alpine3.19

RUN apk --no-cache add curl

ENV FRONTEND_LIB=/dashboard/packages/dashboard-frontend/lib/public
ENV BACKEND_LIB=/dashboard/packages/dashboard-backend/lib
ENV BACKEND_NODE_MODULES=/dashboard/packages/dashboard-backend/node_modules/
ENV DEVFILE_REGISTRY=/dashboard/packages/devfile-registry

COPY --from=builder ${BACKEND_LIB} /backend
COPY --from=builder ${BACKEND_NODE_MODULES} /backend/node_modules
COPY --from=builder ${FRONTEND_LIB} /public
COPY --from=builder ${DEVFILE_REGISTRY} /public/dashboard/devfile-registry

COPY build/dockerfiles/entrypoint.sh /entrypoint.sh

EXPOSE 80
EXPOSE 443

ENTRYPOINT [ "/entrypoint.sh" ]
CMD [ "sh" ]
