// src/components/CartTable.tsx



import { memo } from "react";

import { useKioskStore } from "@/store/kioskStore";

import CartRow from "./CartRow"; 



// 💡 총 합계 영역을 분리하여 렌더링 부하를 줄입니다.

const TotalSummary = memo(() => {

    const menuCount = useKioskStore((s) => s.cart.menuCount);

    const totalPrice = useKioskStore((s) => s.cart.totalPrice);

    

    // console.log("💰 TotalSummary 렌더");



    return (

        <div className="grid grid-cols-4 text-center text-black text-3xl font-semibold font-pretendard mt-3">

            <div>총 합계</div>

            <div>{menuCount}</div>

            <div>-</div>

            <div>{totalPrice.toLocaleString()} 원</div>

        </div>

    );

});





function CartTable() {

  // CartTable은 카트 항목 배열만 구독합니다. (menus가 바뀔 때만 리렌더)

  const menus = useKioskStore((s) => s.cart.menus);

    

  console.log("🧺 CartTable 렌더");



  return (

    <div className="w-[894px] h-[548px] bg-[#ECEEF5] rounded-2xl p-6 shadow-sm flex flex-col">

      {/* 테이블 헤더 */}

      <div className="grid grid-cols-4 text-center text-black text-3xl font-semibold font-pretendard border-b border-gray-400 pb-3">

        <div>메뉴</div>

        <div>수량</div>

        <div>옵션</div>

        <div>금액</div>

      </div>



      {/* 테이블 본문 */}

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent mt-2">

        {menus.length === 0 ? (

          <div className="flex justify-center items-center h-full text-gray-500 text-2xl font-pretendard">

            장바구니가 비어 있습니다 ☕️

          </div>

        ) : (

          menus.map((menu) => (

            <CartRow 

                key={menu.id} 

                menu={menu} 

            /> 

          ))

        )}

      </div>



      {/* 총합 (분리된 TotalSummary 컴포넌트 사용) */}

      <TotalSummary />

    </div>

  );

}



export default memo(CartTable);