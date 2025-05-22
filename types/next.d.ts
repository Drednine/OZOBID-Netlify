import type { NextPage } from 'next';
import type { ReactElement, ReactNode } from 'react';

declare module 'next' {
  export type NextPageWithLayout<P = {}, IP = P> = NextPage<P, IP> & {
    getLayout?: (page: ReactElement) => ReactNode;
  };
}

declare module 'next/dist/lib/metadata/types/metadata-interface.js' {
  interface ResolvingMetadata {}
  interface Metadata {}
  interface ResolvedMetadata {}
  interface ResolvingViewport {}
  interface Viewport {}
  interface ResolvedViewport {}
} 