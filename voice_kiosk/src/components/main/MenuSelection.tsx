// src/components/main/MenuSelection.tsx

import Header from "@/components/Header";
import Character from "@/components/Character";
import Captions from "@/components/Captions";
import CartTable from "@/components/CartTable";

export default function MenuSelection() {
  return (
    <div className="relative w-[1080px] h-[1920px] overflow-hidden bg-gray-100 flex flex-col">

      {/* HEADER */}
      <div className="w-full h-36 flex-shrink-0">
        <Header />
      </div>

      {/* CHARACTER */}
      <div className="w-full flex justify-center mt-[50px] mb-[50px] flex-shrink-0">
        <Character />
      </div>

      {/* CAPTIONS */}
      <div className="px-10 text-center text-neutral-800 text-6xl font-semibold font-pretendard mb-10">
        <Captions />
      </div>

      {/* CART TABLE — margin-top 추가 */}
      <div className="w-full flex justify-center items-start px-10 flex-grow mt-20">
        <CartTable />
      </div>

    </div>
  );
}
