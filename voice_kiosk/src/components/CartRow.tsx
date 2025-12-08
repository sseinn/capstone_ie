// src/components/CartRow.tsx



import { memo } from "react";



export interface CartMenu {

  id: number; // number 타입으로 수정 완료

  name: string;

  price: number;

  options: { name: string }[];

}



interface Props {

  menu: CartMenu;

}



function CartRow({ menu }: Props) {

  return (

    <div className="grid grid-cols-4 text-center text-black text-3xl font-semibold font-pretendard py-3 border-b border-gray-300">

      {/* 메뉴 이름 */}

      <div>{menu.name}</div>



      {/* 수량 (현재 임시로 1) */}

      <div>1</div>



      {/* 옵션 */}

      <div>

        {menu.options.length > 0

          ? menu.options.map((opt: { name: string }) => opt.name).join(", ")

          : "-"}

      </div>



      {/* 금액 */}

      <div>{menu.price.toLocaleString()} 원</div>

    </div>

  );

}



export default memo(CartRow);