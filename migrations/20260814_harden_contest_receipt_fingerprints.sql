create or replace function public.sanitize_contest_receipt_fingerprint()
returns trigger
language plpgsql
as $$
begin
  if new.status not in ('approved','pending')
     or new.receipt_number is null or btrim(new.receipt_number) = ''
     or new.purchase_date is null
     or new.total_amount is null
     or new.retailer_name is null or btrim(new.retailer_name) = '' then
    new.receipt_fingerprint := null;
  end if;
  return new;
end;
$$;

drop trigger if exists contest_receipt_fingerprint_guard on public.contest_receipt_claims;
create trigger contest_receipt_fingerprint_guard
before insert or update of status, receipt_fingerprint, receipt_number, purchase_date, total_amount, retailer_name
on public.contest_receipt_claims
for each row
execute function public.sanitize_contest_receipt_fingerprint();

update public.contest_receipt_claims
set receipt_fingerprint = null
where receipt_fingerprint is not null
  and (
    status not in ('approved','pending')
    or receipt_number is null or btrim(receipt_number) = ''
    or purchase_date is null
    or total_amount is null
    or retailer_name is null or btrim(retailer_name) = ''
  );
