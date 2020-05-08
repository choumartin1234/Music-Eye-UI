import React from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';

const Main = dynamic(() => import('../components/Main'), { ssr: false });

export default () => {
  return (
    <>
      <Head>
        <title>Music Eye</title>
      </Head>
      <Main />
    </>
  );
};
